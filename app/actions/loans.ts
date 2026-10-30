// ─────────────────────────────────────────────────────────────
//  app/actions/loans.ts
//
//  THE IMPORTANT FILE. The custody state machine lives here.
//
//    AVAILABLE → RESERVED → ISSUED → COLLECTED → RETURNED → VERIFIED → AVAILABLE
//
//  Two rules that every function below obeys:
//    1. Check WHO is acting (owner vs borrower) — never trust the UI.
//    2. Check the CURRENT status before moving to the next one.
//  Enforce both on the server. The UI will never send an illegal
//  request, but an attacker with curl absolutely will.
// ─────────────────────────────────────────────────────────────

"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string }

const DEFAULT_LOAN_DAYS = 3

function fourDigitCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

function refreshViews(itemId?: string) {
  revalidatePath("/items")
  revalidatePath("/dashboard")
  if (itemId) revalidatePath(`/items/${itemId}`)
}

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

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { ownerId: true, slot: true },
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
  // ─────────────────────────────────────────────────────────────
  const claimed = await prisma.item.updateMany({
    where: { id: itemId, status: "AVAILABLE" },
    data: { status: "RESERVED" },
  })

  if (claimed.count === 0) {
    return { ok: false, error: "Someone just reserved this item. Try another one." }
  }

  // Only the winner reaches this line.
  const dueAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000)

  try {
    const loan = await prisma.loan.create({
      data: {
        itemId,
        borrowerId: userId,
        status: "RESERVED",
        pickupCode: fourDigitCode(),
        slot: item.slot,
        dueAt,
      },
      select: { id: true, pickupCode: true, dueAt: true },
    })

    refreshViews(itemId)
    return { ok: true, loanId: loan.id, pickupCode: loan.pickupCode, dueAt: loan.dueAt }
  } catch (e) {
    // If creating the loan fails, put the item back — never leave it
    // stranded in RESERVED with no loan attached to it.
    await prisma.item.updateMany({
      where: { id: itemId, status: "RESERVED" },
      data: { status: "AVAILABLE" },
    })
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
  if (!photoUrl) return { ok: false, error: "A condition photo is required when issuing." }

  await prisma.$transaction([
    prisma.loan.update({
      where: { id: loanId },
      data: { status: "ISSUED", issuedAt: new Date() },
    }),
    prisma.item.update({ where: { id: loan.itemId }, data: { status: "ISSUED" } }),
    prisma.conditionLog.create({
      data: { loanId, phase: "ISSUE", photoUrl, notes: notes?.trim() || null },
    }),
  ])

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

  await prisma.loan.update({
    where: { id: loanId },
    data: { status: "COLLECTED", collectedAt: new Date() },
  })

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
  if (!photoUrl) return { ok: false, error: "A condition photo is required when returning." }

  await prisma.$transaction([
    prisma.loan.update({
      where: { id: loanId },
      data: { status: "RETURNED", returnedAt: new Date() },
    }),
    // Not AVAILABLE yet — the owner still has to look at the photos.
    prisma.item.update({ where: { id: loan.itemId }, data: { status: "AWAITING_CHECK" } }),
    prisma.conditionLog.create({
      data: { loanId, phase: "RETURN", photoUrl, notes: notes?.trim() || null },
    }),
  ])

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

  await prisma.$transaction([
    prisma.loan.update({
      where: { id: loanId },
      data: { status: "VERIFIED", verifiedAt: new Date() },
    }),
    prisma.item.update({ where: { id: loan.itemId }, data: { status: "AVAILABLE" } }),
  ])

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

  await prisma.$transaction([
    prisma.loan.update({ where: { id: loanId }, data: { status: "CANCELLED" } }),
    prisma.item.update({ where: { id: loan.itemId }, data: { status: "AVAILABLE" } }),
  ])

  refreshViews(loan.itemId)
  return { ok: true }
}
