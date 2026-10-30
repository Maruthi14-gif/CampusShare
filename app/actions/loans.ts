// ─────────────────────────────────────────────────────────────
//  app/actions/loans.ts
//
//  THE IMPORTANT FILE. The custody state machine lives here.
//
//    AVAILABLE → RESERVED → ISSUED → COLLECTED → RETURNED → VERIFIED → AVAILABLE
//
//  Three rules that every function below obeys:
//    1. Check WHO is acting (owner vs borrower) — never trust the UI.
//    2. Check the CURRENT status before moving to the next one.
//    3. Do that status check INSIDE the write, never as a separate read.
//  Enforce all three on the server. The UI will never send an illegal
//  request, but an attacker with curl absolutely will.
// ─────────────────────────────────────────────────────────────

"use server"

import { revalidatePath } from "next/cache"
import type { ItemStatus, LoanStatus, Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { isValidPhoto } from "@/lib/utils"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const DEFAULT_LOAN_DAYS = 3
const MAX_LOAN_DAYS = 14
const MAX_NOTES = 300

// Neon can take a few seconds to wake from idle; give transactions room.
const TX_OPTIONS = { maxWait: 10_000, timeout: 15_000 }

function fourDigitCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function refreshViews(itemId?: string) {
  revalidatePath("/items")
  revalidatePath("/dashboard")
  if (itemId) revalidatePath(`/items/${itemId}`)
}

/** Thrown inside a transaction when another request changed the row first. */
class LostRace extends Error {}

// ═══════════════════════════════════════════════════════════════
//  The one place a loan changes state.
//
//  THE SECOND RACE CONDITION FIX
//
//  The old version of every step below did:
//      const loan = await prisma.loan.findUnique(...)
//      if (loan.status === "RESERVED") { await prisma.loan.update(...) }
//
//  Same bug as reserving: the owner taps "Mark as issued" while the
//  borrower taps "Cancel". Both read RESERVED, both write. The loan
//  ends up CANCELLED, the item AVAILABLE, and the calculator is
//  physically sitting in someone's slot. A double-tap also wrote two
//  condition photos for one handover.
//
//  The fix is the same idea as reserveItem: the status check goes into
//  the WHERE of the write (`updateMany` where status is what we expect).
//  Exactly one request gets count === 1. The item update and the photo
//  are in the same transaction, so they only happen for the winner.
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
        await tx.item.update({
          where: { id: opts.itemId },
          data: { status: opts.itemStatus },
        })
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

const CHANGED = "This loan was just updated by someone else. Refresh the page."

// ═══════════════════════════════════════════════════════════════
//  1. RESERVE  —  read section 6 of the plan before touching this
// ═══════════════════════════════════════════════════════════════

export async function reserveItem(
  itemId: string,
  days: number = DEFAULT_LOAN_DAYS
): Promise<Result<{ loanId: string; pickupCode: string; dueAt: Date }>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const userId = session.user.id

  // `days` arrives from the browser, so anyone can send 9999 or "abc".
  if (!Number.isInteger(days) || days < 1 || days > MAX_LOAN_DAYS)
    return { ok: false, error: `Loans can be 1 to ${MAX_LOAN_DAYS} days.` }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { ownerId: true },
  })
  if (!item) return { ok: false, error: "Item not found." }
  if (item.ownerId === userId) return { ok: false, error: "You can't borrow your own item." }

  // ─────────────────────────────────────────────────────────────
  //  THE RACE CONDITION FIX
  //
  //  The naive version is:
  //      const item = await prisma.item.findUnique(...)
  //      if (item.status === "AVAILABLE") { await prisma.item.update(...) }
  //
  //  Two students tapping Reserve at the same instant BOTH pass the
  //  `if`, because neither has written yet. The item gets promised
  //  twice. This is the first thing a demo audience will try.
  //
  //  The fix: put the condition INSIDE the write. `updateMany` with
  //  `where: { status: "AVAILABLE" }` is a single SQL statement, so
  //  Postgres serialises it. Exactly one caller gets count === 1.
  //
  //  Claiming the item and creating the loan share one transaction,
  //  so the item can never be left RESERVED with no loan attached.
  // ─────────────────────────────────────────────────────────────
  const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  try {
    const loan = await prisma.$transaction(async (tx) => {
      const claimed = await tx.item.updateMany({
        where: { id: itemId, status: "AVAILABLE" },
        data: { status: "RESERVED" },
      })
      if (claimed.count === 0) throw new LostRace()

      // Read the slot after claiming, so a slot change made a moment
      // ago is the one the borrower is told about.
      const current = await tx.item.findUniqueOrThrow({
        where: { id: itemId },
        select: { slot: true },
      })

      return tx.loan.create({
        data: {
          itemId,
          borrowerId: userId,
          status: "RESERVED",
          pickupCode: fourDigitCode(),
          slot: current.slot,
          dueAt,
        },
        select: { id: true, pickupCode: true, dueAt: true },
      })
    }, TX_OPTIONS)

    refreshViews(itemId)
    return { ok: true, loanId: loan.id, pickupCode: loan.pickupCode, dueAt: loan.dueAt }
  } catch (e) {
    if (e instanceof LostRace)
      return { ok: false, error: "Someone just reserved this item. Try another one." }
    console.error("reserveItem failed", e)
    return { ok: false, error: "Could not create the reservation. Please try again." }
  }
}

// ═══════════════════════════════════════════════════════════════
//  2. ISSUE  —  lender drops the item in the slot
// ═══════════════════════════════════════════════════════════════

export async function markIssued(
  loanId: string,
  photoUrl: string,
  notes?: string
): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { status: true, itemId: true, item: { select: { ownerId: true } } },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  if (loan.item.ownerId !== session.user.id)
    return { ok: false, error: "Only the owner can issue this item." }
  if (loan.status !== "RESERVED")
    return { ok: false, error: `This loan is already ${loan.status.toLowerCase()}.` }
  if (!isValidPhoto(photoUrl))
    return { ok: false, error: "A condition photo is required when issuing." }

  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["RESERVED"],
    data: { status: "ISSUED", issuedAt: new Date() },
    itemStatus: "ISSUED",
    log: { phase: "ISSUE", photoUrl, notes },
  })
  if (!done) return { ok: false, error: CHANGED }

  refreshViews(loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  3. COLLECT  —  borrower takes it out of the slot
// ═══════════════════════════════════════════════════════════════

export async function markCollected(loanId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { status: true, itemId: true, borrowerId: true },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  if (loan.borrowerId !== session.user.id)
    return { ok: false, error: "Only the borrower can confirm collection." }
  if (loan.status !== "ISSUED")
    return { ok: false, error: "This item hasn't been issued yet." }

  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["ISSUED"],
    data: { status: "COLLECTED", collectedAt: new Date() },
  })
  if (!done) return { ok: false, error: CHANGED }

  refreshViews(loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  4. RETURN  —  borrower puts it back, with the second photo
// ═══════════════════════════════════════════════════════════════

export async function markReturned(
  loanId: string,
  photoUrl: string,
  notes?: string
): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { status: true, itemId: true, borrowerId: true },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  if (loan.borrowerId !== session.user.id)
    return { ok: false, error: "Only the borrower can return this item." }
  if (loan.status !== "COLLECTED" && loan.status !== "ISSUED")
    return { ok: false, error: "This loan isn't in a state that can be returned." }
  if (!isValidPhoto(photoUrl))
    return { ok: false, error: "A condition photo is required when returning." }

  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["COLLECTED", "ISSUED"],
    data: { status: "RETURNED", returnedAt: new Date() },
    // Not AVAILABLE yet — the owner still has to look at the photos.
    itemStatus: "AWAITING_CHECK",
    log: { phase: "RETURN", photoUrl, notes },
  })
  if (!done) return { ok: false, error: CHANGED }

  refreshViews(loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  5. VERIFY  —  lender compares the two photos, closes the loop
// ═══════════════════════════════════════════════════════════════

export async function markVerified(loanId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const loan = await prisma.loan.findUnique({
    where: { id: loanId },
    select: { status: true, itemId: true, item: { select: { ownerId: true } } },
  })
  if (!loan) return { ok: false, error: "Loan not found." }
  if (loan.item.ownerId !== session.user.id)
    return { ok: false, error: "Only the owner can verify the return." }
  if (loan.status !== "RETURNED")
    return { ok: false, error: "This item hasn't been returned yet." }

  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["RETURNED"],
    data: { status: "VERIFIED", verifiedAt: new Date() },
    itemStatus: "AVAILABLE",
  })
  if (!done) return { ok: false, error: CHANGED }

  refreshViews(loan.itemId)
  return { ok: true }
}

// ═══════════════════════════════════════════════════════════════
//  6. CANCEL  —  either side backs out before handover
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
    return { ok: false, error: "Only a reservation that hasn't been issued can be cancelled." }

  // If the owner marks it issued at the same moment, only one of the two
  // wins. Cancel can no longer undo a handover that already happened.
  const done = await transition({
    loanId,
    itemId: loan.itemId,
    from: ["RESERVED"],
    data: { status: "CANCELLED" },
    itemStatus: "AVAILABLE",
  })
  if (!done) return { ok: false, error: "It was issued before the cancel went through." }

  refreshViews(loan.itemId)
  return { ok: true }
}
