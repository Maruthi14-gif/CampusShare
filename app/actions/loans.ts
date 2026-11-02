// ─────────────────────────────────────────────────────────────
//  app/actions/loans.ts
//
//  THE IMPORTANT FILE. The custody state machine lives here.
//
//    AVAILABLE → RESERVED → ISSUED → RETURNED → VERIFIED → AVAILABLE
//                   │          │          └──→ PROBLEM (owner reports damage)
//                   │          └──→ LOST
//                   └──→ CANCELLED / EXPIRED (not handed over in 24h)
//
//  Handover is in person, confirmed with two one-time codes, like a
//  food-delivery OTP:
//    - pickup code: only the BORROWER sees it; the lender types it in.
//      Proves the borrower really received the item.
//    - return code: only the LENDER sees it; the borrower types it in.
//      Proves the lender really got it back.
//
//  Three rules that every function below obeys:
//    1. Check WHO is acting (owner vs borrower) — never trust the UI.
//    2. Check the CURRENT status before moving to the next one.
//    3. Do that status check INSIDE the write, never as a separate read.
// ─────────────────────────────────────────────────────────────

"use server"

import { revalidatePath } from "next/cache"
import type { ItemStatus, LoanStatus, Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isValidPhoto } from "@/lib/utils"
import { RULES, semesterEnd } from "@/lib/campus"
import { borrowerStanding, meetPlaceFor, otp, promoteWaitlist } from "@/lib/rules"
import { appUrl, sendEmail } from "@/lib/notify"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; needsProfile?: boolean }

const DAY = 86_400_000
const MAX_NOTES = 300

// Neon can take a few seconds to wake from idle; give transactions room.
const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 }

function refreshViews(itemId?: string) {
  revalidatePath("/items")
  revalidatePath("/dashboard")
  revalidatePath("/requests")
  if (itemId) revalidatePath(`/items/${itemId}`)
}

/** Thrown inside a transaction when another request changed the row first. */
class LostRace extends Error {}
class Refused extends Error {}

const CHANGED = "This loan was just updated by someone else. Refresh the page."

// ═══════════════════════════════════════════════════════════════
//  The one place a loan changes state.
//
//  The status check goes into the WHERE of the write (`updateMany` where
//  status is what we expect), so two simultaneous taps can't both win.
//  The item update and the photo are in the same transaction.
// ═══════════════════════════════════════════════════════════════

async function transition(opts: {
  loanId: string
  itemId: string
  from: LoanStatus[]
  data: Prisma.LoanUpdateManyMutationInput
  itemStatus?: ItemStatus
  log?: { phase: "ISSUE" | "RETURN"; photoUrl: string; notes?: string }
}): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      const moved = await tx.loan.updateMany({
        where: { id: opts.loanId, status: { in: opts.from } },
        data: opts.data,
      })
      if (moved.count !== 1) throw new LostRace()

      if (opts.itemStatus) {
        await tx.item.update({ where: { id: opts.itemId }, data: { status: opts.itemStatus } })
      }
      if (opts.log) {
        await tx.conditionLog.create({
          data: {
            loanId: opts.loanId,
            phase: opts.log.phase,
            photoUrl: opts.log.photoUrl,
            notes: opts.log.notes?.trim().slice(0, MAX_NOTES) || null,
          },
        })
      }
    }, TX_OPTIONS)
    return true
  } catch (e) {
    if (e instanceof LostRace) return false
    throw e
  }
}

/**
 * Checks a typed one-time code. After RULES.otpMaxTries wrong guesses the
 * code is replaced, so nobody can try all 9000 combinations.
 */
async function checkCode(
  loanId: string,
  typed: string,
  which: "pickup" | "return"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { pickupCode: true, returnCode: true, codeTries: true, returnTries: true },
  })
  if (!loan) return { ok: false, error: "Loan not found." }

  const expected = which === "pickup" ? loan.pickupCode : loan.returnCode
  if (expected !== "" && String(typed ?? "").trim() === expected) {
    await prisma.loan.update({
      where: { id: loanId },
      data: which === "pickup" ? { codeTries: 0 } : { returnTries: 0 },
    })
    return { ok: true }
  }

  const after = await prisma.loan.update({
    where: { id: loanId },
    data: which === "pickup" ? { codeTries: { increment: 1 } } : { returnTries: { increment: 1 } },
    select: { codeTries: true, returnTries: true },
  })
  const count = which === "pickup" ? after.codeTries : after.returnTries
  if (count >= RULES.otpMaxTries) {
    await prisma.loan.update({
      where: { id: loanId },
      data: which === "pickup" ? { pickupCode: otp(), codeTries: 0 } : { returnCode: otp(), returnTries: 0 },
    })
    return {
      ok: false,
      error: `Too many wrong codes. A new code was issued — ask the ${which === "pickup" ? "borrower" : "lender"} to refresh their page.`,
    }
  }
  return { ok: false, error: `That code doesn't match. ${RULES.otpMaxTries - count} tries left.` }
}

// ═══════════════════════════════════════════════════════════════
//  1. RESERVE
// ═══════════════════════════════════════════════════════════════

/**
 * Reserves an item for `borrowerId`. Shared by "Reserve" and by a lender
 * answering a request ("I can lend this"). Not exported as an action:
 * callers check who is signed in first.
 */
async function reserveFor(
  itemId: string,
  borrowerId: string,
  days: number
): Promise<Result<{ loanId: string; pickupCode: string; dueAt: Date; meetPlace: string }>> {
  if (!Number.isInteger(days) || days < 1 || days > RULES.maxLoanDays)
    return { ok: false, error: `Loans can be 1 to ${RULES.maxLoanDays} days.` }

  const [item, borrower] = await Promise.all([
    prisma.item.findUnique({
      where: { id: itemId },
      select: {
        title: true,
        ownerId: true,
        meetSpot: true,
        allowRoom: true,
        holdUserId: true,
        holdUntil: true,
        owner: { select: { hostel: true, room: true, email: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: borrowerId }, select: { hostel: true, name: true } }),
  ])
  if (!item) return { ok: false, error: "Item not found." }
  if (!borrower) return { ok: false, error: "Student not found." }
  if (item.ownerId === borrowerId) return { ok: false, error: "You can't borrow your own item." }
  if (!borrower.hostel)
    return { ok: false, error: "Add your hostel on your profile first.", needsProfile: true }

  const held = item.holdUserId && item.holdUntil && item.holdUntil > new Date()
  if (held && item.holdUserId !== borrowerId)
    return { ok: false, error: "This item is held for the next student on its waitlist." }

  const standing = await borrowerStanding(borrowerId)
  if (standing.reason) return { ok: false, error: standing.reason }

  let dueAt = new Date(Date.now() + days * DAY)
  const end = semesterEnd()
  if (end) {
    if (Date.now() > end.getTime()) return { ok: false, error: "The semester has ended. Lending reopens next term." }
    if (dueAt > end) dueAt = end
  }
  const meetPlace = meetPlaceFor(item, item.owner, borrower)

  try {
    const loan = await prisma.$transaction(async (tx) => {
      // One reservation at a time per borrower, so two quick taps on two
      // different items can't slip past the "2 items at once" limit.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${borrowerId}))`
      const active = await tx.loan.count({
        where: { borrowerId, status: { in: ["RESERVED", "ISSUED", "COLLECTED"] } },
      })
      if (active >= standing.limit)
        throw new Refused(`You can hold ${standing.limit} items at a time. Return one first.`)

      // THE RACE CONDITION FIX: the "is it free?" check is inside the write.
      // Two students tapping Reserve at the same instant can't both win.
      const claimed = await tx.item.updateMany({
        where: {
          id: itemId,
          status: "AVAILABLE",
          OR: [{ holdUserId: null }, { holdUserId: borrowerId }, { holdUntil: { lt: new Date() } }],
        },
        data: { status: "RESERVED", holdUserId: null, holdUntil: null },
      })
      if (claimed.count === 0) throw new LostRace()

      await tx.waitlistEntry.deleteMany({ where: { itemId, userId: borrowerId } })

      return tx.loan.create({
        data: { itemId, borrowerId, status: "RESERVED", pickupCode: otp(), meetPlace, dueAt },
        select: { id: true, pickupCode: true, dueAt: true },
      })
    }, TX_OPTIONS)

    await sendEmail(
      item.owner.email,
      `${borrower.name ?? "A student"} reserved your ${item.title}`,
      `Hand it over at: ${meetPlace}\nWithin ${RULES.reserveHoldHours} hours, or the reservation cancels itself.\n${appUrl(`/items/${itemId}`)}`
    )
    refreshViews(itemId)
    return { ok: true, loanId: loan.id, pickupCode: loan.pickupCode, dueAt: loan.dueAt, meetPlace }
  } catch (e) {
    if (e instanceof LostRace) return { ok: false, error: "Someone just reserved this item. Try another one." }
    if (e instanceof Refused) return { ok: false, error: e.message }
    console.error("reserveFor failed", e)
    return { ok: false, error: "Could not create the reservation. Please try again." }
  }
}

export async function reserveItem(itemId: string, days: number = RULES.loanDays) {
  const session = await auth()
  if (!session?.user?.id) return { ok: false as const, error: "Please sign in first." }
  return reserveFor(itemId, session.user.id, days)
}

// ═══════════════════════════════════════════════════════════════
//  1b. ANSWER A REQUEST  —  "I can lend this"
// ═══════════════════════════════════════════════════════════════

/**
 * A lender offers one of their AVAILABLE items to an open request. The
 * request is claimed first (so two lenders can't both fulfil it), then the
 * item is reserved for the requester. If that fails, the request reopens.
 */
export async function fulfilRequest(requestId: string, itemId: string): Promise<Result<{ loanId: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const me = session.user.id

  const [request, item] = await Promise.all([
    prisma.request.findUnique({
      where: { id: requestId },
      select: { userId: true, status: true, neededBy: true, title: true, user: { select: { email: true } } },
    }),
    prisma.item.findUnique({ where: { id: itemId }, select: { ownerId: true, title: true } }),
  ])
  if (!request || request.status !== "OPEN" || request.neededBy < new Date())
    return { ok: false, error: "This request is no longer open." }
  if (!item || item.ownerId !== me) return { ok: false, error: "Pick one of your own items." }
  if (request.userId === me) return { ok: false, error: "That's your own request." }

  const claimed = await prisma.request.updateMany({
    where: { id: requestId, status: "OPEN" },
    data: { status: "FULFILLED" },
  })
  if (claimed.count !== 1) return { ok: false, error: "Someone else just answered this request." }

  const days = Math.min(
    RULES.maxLoanDays,
    Math.max(1, Math.ceil((request.neededBy.getTime() - Date.now()) / DAY) + 1)
  )
  const reserved = await reserveFor(itemId, request.userId, days)
  if (!reserved.ok) {
    await prisma.request.update({ where: { id: requestId }, data: { status: "OPEN" } })
    return reserved
  }

  await prisma.request.update({ where: { id: requestId }, data: { loanId: reserved.loanId } })
  await sendEmail(
    request.user.email,
    `Someone can lend you a ${request.title}`,
    `${item.title} is reserved for you. Your pickup code is on this page: ${appUrl(`/items/${itemId}`)}`
  )
  refreshViews(itemId)
  return { ok: true, loanId: reserved.loanId }
}

// ═══════════════════════════════════════════════════════════════
//  2. HAND OVER  —  lender types the borrower's pickup code
// ═══════════════════════════════════════════════════════════════

export async function markIssued(loanId: string, code: string, photoUrl: string, notes?: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { status: true, itemId: true, item: { select: { ownerId: true } } },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  if (loan.item.ownerId !== session.user.id) return { ok: false, error: "Only the owner can hand this over." }
  if (loan.status !== "RESERVED") return { ok: false, error: `This loan is already ${loan.status.toLowerCase()}.` }
  if (!isValidPhoto(photoUrl)) return { ok: false, error: "A condition photo is required at handover." }

  const check = await checkCode(loanId, code, "pickup")
  if (!check.ok) return check

  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["RESERVED"],
    data: { status: "ISSUED", issuedAt: new Date(), returnCode: otp(), returnTries: 0 },
    itemStatus: "ISSUED",
    log: { phase: "ISSUE", photoUrl, notes },
  })
  if (!done) return { ok: false, error: CHANGED }

  refreshViews(loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  3. RETURN  —  borrower types the lender's return code
// ═══════════════════════════════════════════════════════════════

export async function markReturned(
  loanId: string,
  code: string,
  photoUrl: string,
  notes?: string,
  /** Optional one-line thank-you to the lender, shown on their profile. */
  thanks?: string
): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { status: true, itemId: true, borrowerId: true },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  if (loan.borrowerId !== session.user.id) return { ok: false, error: "Only the borrower can return this item." }
  if (loan.status !== "ISSUED" && loan.status !== "COLLECTED")
    return { ok: false, error: "This loan isn't in a state that can be returned." }
  if (!isValidPhoto(photoUrl)) return { ok: false, error: "A condition photo is required when returning." }

  const check = await checkCode(loanId, code, "return")
  if (!check.ok) return check

  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["ISSUED", "COLLECTED"],
    data: {
      status: "RETURNED",
      returnedAt: new Date(),
      extendDays: null,
      returnRequestedAt: null,
      thanksNote: String(thanks ?? "").trim().slice(0, 140) || null,
    },
    // Not AVAILABLE yet — the owner still compares the two photos.
    itemStatus: "AWAITING_CHECK",
    log: { phase: "RETURN", photoUrl, notes },
  })
  if (!done) return { ok: false, error: CHANGED }

  refreshViews(loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  4. CLOSE  —  condition fine, or report a problem
// ═══════════════════════════════════════════════════════════════

async function ownerLoan(loanId: string, userId: string) {
  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: {
      status: true,
      itemId: true,
      dueAt: true,
      extendDays: true,
      borrowerId: true,
      borrower: { select: { email: true } },
      item: { select: { ownerId: true, title: true } },
    },
  })
  if (!loan) return { error: "Loan not found." } as const
  if (loan.item.ownerId !== userId) return { error: "Only the owner can do this." } as const
  return { loan } as const
}

export async function markVerified(loanId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const r = await ownerLoan(loanId, session.user.id)
  if ("error" in r) return { ok: false, error: r.error! }
  if (r.loan.status !== "RETURNED") return { ok: false, error: "This item hasn't been returned yet." }

  const done = await transition({
    loanId,
    itemId: r.loan.itemId,
    from: ["RETURNED"],
    data: { status: "VERIFIED", verifiedAt: new Date(), closedAt: new Date() },
    itemStatus: "AVAILABLE",
  })
  if (!done) return { ok: false, error: CHANGED }

  await promoteWaitlist(r.loan.itemId)
  refreshViews(r.loan.itemId)
  return { ok: true }
}

export async function reportProblem(loanId: string, note: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const r = await ownerLoan(loanId, session.user.id)
  if ("error" in r) return { ok: false, error: r.error! }
  if (r.loan.status !== "RETURNED") return { ok: false, error: "You can report a problem once it's returned." }
  const text = String(note ?? "").trim()
  if (text.length < 5) return { ok: false, error: "Describe the problem in a few words." }

  // The item is paused, not relisted: the owner relists it when it's fixed.
  const done = await transition({
    loanId,
    itemId: r.loan.itemId,
    from: ["RETURNED"],
    data: { status: "PROBLEM", problemNote: text.slice(0, MAX_NOTES), closedAt: new Date() },
    itemStatus: "PAUSED",
  })
  if (!done) return { ok: false, error: CHANGED }

  refreshViews(r.loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  5. CANCEL  —  either side, before handover
// ═══════════════════════════════════════════════════════════════

export async function cancelReservation(loanId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const userId = session.user.id

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { status: true, itemId: true, borrowerId: true, item: { select: { ownerId: true } } },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  if (loan.borrowerId !== userId && loan.item.ownerId !== userId)
    return { ok: false, error: "This isn't your reservation." }
  if (loan.status !== "RESERVED")
    return { ok: false, error: "Only a reservation that hasn't been handed over can be cancelled." }

  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["RESERVED"],
    data: { status: "CANCELLED", closedAt: new Date() },
    itemStatus: "AVAILABLE",
  })
  if (!done) return { ok: false, error: "It was handed over before the cancel went through." }

  await promoteWaitlist(loan.itemId)
  refreshViews(loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  6. EXTRA TIME, EARLY RETURN, LOST
// ═══════════════════════════════════════════════════════════════

export async function requestExtension(loanId: string, days: number): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  if (!Number.isInteger(days) || days < 1 || days > RULES.maxExtendDays)
    return { ok: false, error: `Ask for 1 to ${RULES.maxExtendDays} days.` }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { borrowerId: true, itemId: true, item: { select: { title: true, owner: { select: { email: true } } } } },
  })
  if (!loan || loan.borrowerId !== session.user.id) return { ok: false, error: "This isn't your loan." }

  const asked = await prisma.loan.updateMany({
    where: { id: loanId, status: { in: ["ISSUED", "COLLECTED"] }, extendDays: null },
    data: { extendDays: days },
  })
  if (asked.count !== 1) return { ok: false, error: "You already asked, or the loan isn't active." }

  await sendEmail(
    loan.item.owner.email,
    `Extra ${days} day${days === 1 ? "" : "s"} asked for your ${loan.item.title}`,
    `Approve or decline: ${appUrl(`/items/${loan.itemId}`)}`
  )
  refreshViews(loan.itemId)
  return { ok: true }
}

export async function answerExtension(loanId: string, approve: boolean): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const r = await ownerLoan(loanId, session.user.id)
  if ("error" in r) return { ok: false, error: r.error! }
  const days = r.loan.extendDays
  if (!days) return { ok: false, error: "There's no pending request." }

  let newDue = new Date(r.loan.dueAt.getTime() + days * DAY)
  const end = semesterEnd()
  if (end && newDue > end) newDue = end

  const answered = await prisma.loan.updateMany({
    where: { id: loanId, extendDays: days, status: { in: ["ISSUED", "COLLECTED"] } },
    data: approve ? { dueAt: newDue, extendDays: null } : { extendDays: null },
  })
  if (answered.count !== 1) return { ok: false, error: CHANGED }

  await sendEmail(
    r.loan.borrower.email,
    approve ? `Extra time approved for ${r.loan.item.title}` : `Extra time declined for ${r.loan.item.title}`,
    approve ? `New due date: ${newDue.toDateString()}` : "Please return it by the original due date."
  )
  refreshViews(r.loan.itemId)
  return { ok: true }
}

export async function requestEarlyReturn(loanId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const r = await ownerLoan(loanId, session.user.id)
  if ("error" in r) return { ok: false, error: r.error! }

  const asked = await prisma.loan.updateMany({
    where: { id: loanId, status: { in: ["ISSUED", "COLLECTED"] }, returnRequestedAt: null },
    data: { returnRequestedAt: new Date() },
  })
  if (asked.count !== 1) return { ok: false, error: "Already asked, or the loan isn't active." }

  await sendEmail(
    r.loan.borrower.email,
    `The owner needs their ${r.loan.item.title} back`,
    `Please return it as soon as you can: ${appUrl(`/items/${r.loan.itemId}`)}`
  )
  refreshViews(r.loan.itemId)
  return { ok: true }
}

/**
 * The borrower can admit a loss at any time while they have it.
 * The owner can mark it lost once it is RULES.lostAfterOverdueDays overdue.
 */
export async function markLost(loanId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const userId = session.user.id

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { status: true, itemId: true, borrowerId: true, dueAt: true, item: { select: { ownerId: true } } },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  const isBorrower = loan.borrowerId === userId
  const isOwner = loan.item.ownerId === userId
  if (!isBorrower && !isOwner) return { ok: false, error: "This isn't your loan." }
  if (isOwner && !isBorrower) {
    const overdueDays = (Date.now() - loan.dueAt.getTime()) / DAY
    if (overdueDays < RULES.lostAfterOverdueDays)
      return { ok: false, error: `You can mark it lost once it's ${RULES.lostAfterOverdueDays} days overdue.` }
  }

  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["ISSUED", "COLLECTED"],
    data: { status: "LOST", closedAt: new Date() },
    itemStatus: "LOST",
  })
  if (!done) return { ok: false, error: CHANGED }

  refreshViews(loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  7. REPORT A STUDENT  —  stored for the organisers to review
// ═══════════════════════════════════════════════════════════════

export async function reportStudent(loanId: string, reason: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const userId = session.user.id
  const text = String(reason ?? "").trim()
  if (text.length < 10) return { ok: false, error: "Tell us what happened in a sentence or two." }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { borrowerId: true, item: { select: { ownerId: true } } },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  const other =
    loan.borrowerId === userId ? loan.item.ownerId : loan.item.ownerId === userId ? loan.borrowerId : null
  if (!other) return { ok: false, error: "You can only report someone from your own loan." }

  await prisma.report.create({
    data: { reporterId: userId, reportedId: other, loanId, reason: text.slice(0, 1000) },
  })
  return { ok: true }
}
