/**
 * Server-side rules shared by the actions and pages.
 */
import { prisma } from "@/lib/prisma"
import { RULES } from "@/lib/campus"
import { appUrl, sendEmail } from "@/lib/notify"

const DAY = 86_400_000
const HOUR = 3_600_000

/** A random 4-digit code, never starting with 0 so it reads cleanly. */
export function otp() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

/**
 * Where the handover happens.
 * Same hostel + lender allows it + lender has a room on file -> their room.
 * Anything else -> the public spot the lender picked.
 */
export function meetPlaceFor(
  item: { meetSpot: string; allowRoom: boolean },
  owner: { hostel: string | null; room: string | null },
  borrower: { hostel: string | null }
) {
  if (item.allowRoom && owner.room && owner.hostel && owner.hostel === borrower.hostel) {
    return `Room ${owner.room}, ${owner.hostel}`
  }
  return item.meetSpot
}

/** Loans that count against a borrower: late returns, problems, losses. */
async function strikes(userId: string) {
  const since = new Date(Date.now() - RULES.strikeWindowDays * DAY)
  const rows = await prisma.loan.findMany({
    where: {
      borrowerId: userId,
      OR: [
        { status: { in: ["PROBLEM", "LOST"] }, closedAt: { gte: since } },
        { returnedAt: { gte: since } },
      ],
    },
    select: { status: true, dueAt: true, returnedAt: true, closedAt: true },
  })
  return rows
    .filter((l) => l.status === "PROBLEM" || l.status === "LOST" || (l.returnedAt && l.returnedAt > l.dueAt))
    .map((l) => (l.status === "PROBLEM" || l.status === "LOST" ? l.closedAt! : l.returnedAt!))
    .sort((a, b) => b.getTime() - a.getTime())
}

export type Standing = {
  active: number
  overdue: number
  strikeCount: number
  blockedUntil: Date | null
  /** Why this student can't borrow right now, or null if they can. */
  reason: string | null
}

/** Can this student borrow right now? Used before reserving and on the dashboard. */
export async function borrowerStanding(userId: string): Promise<Standing> {
  const [activeLoans, strikeDates] = await Promise.all([
    prisma.loan.findMany({
      where: { borrowerId: userId, status: { in: ["RESERVED", "ISSUED", "COLLECTED"] } },
      select: { dueAt: true, status: true },
    }),
    strikes(userId),
  ])
  const now = Date.now()
  const overdue = activeLoans.filter((l) => l.status !== "RESERVED" && l.dueAt.getTime() < now).length

  let blockedUntil: Date | null = null
  if (strikeDates.length >= RULES.strikesToBlock) {
    const until = new Date(strikeDates[0].getTime() + RULES.blockDays * DAY)
    if (until.getTime() > now) blockedUntil = until
  }

  let reason: string | null = null
  if (blockedUntil)
    reason = `Borrowing is paused until ${blockedUntil.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} because of ${strikeDates.length} late or problem returns.`
  else if (overdue > 0) reason = "Return your overdue item first."
  else if (activeLoans.length >= RULES.maxActiveBorrows)
    reason = `You can hold ${RULES.maxActiveBorrows} items at a time. Return one first.`

  return { active: activeLoans.length, overdue, strikeCount: strikeDates.length, blockedUntil, reason }
}

/** "12 loans · 0 late" — shown next to a student's name. */
export async function trustStats(userId: string) {
  const done = await prisma.loan.findMany({
    where: { borrowerId: userId, status: { in: ["VERIFIED", "PROBLEM", "LOST"] } },
    select: { status: true, dueAt: true, returnedAt: true },
  })
  const late = done.filter((l) => l.returnedAt && l.returnedAt > l.dueAt).length
  const problems = done.filter((l) => l.status !== "VERIFIED").length
  const lent = await prisma.loan.count({ where: { item: { ownerId: userId }, status: "VERIFIED" } })
  return { borrowed: done.length, late, problems, lent }
}

/**
 * Give a newly free item to the next person on its waitlist: they alone can
 * reserve it for RULES.waitlistHoldHours. With nobody waiting, clear any hold.
 */
export async function promoteWaitlist(itemId: string) {
  const next = await prisma.waitlistEntry.findFirst({
    where: { itemId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { email: true } }, item: { select: { title: true } } },
  })
  if (!next) {
    await prisma.item.updateMany({
      where: { id: itemId, holdUserId: { not: null } },
      data: { holdUserId: null, holdUntil: null },
    })
    return
  }
  const held = await prisma.item.updateMany({
    where: { id: itemId, status: "AVAILABLE" },
    data: { holdUserId: next.userId, holdUntil: new Date(Date.now() + RULES.waitlistHoldHours * HOUR) },
  })
  if (held.count === 1) {
    await prisma.waitlistEntry.delete({ where: { id: next.id } }).catch(() => {})
    await sendEmail(
      next.user.email,
      `${next.item.title} is free — held for you`,
      `It's your turn. ${next.item.title} is held for you for ${RULES.waitlistHoldHours} hours.\nReserve it: ${appUrl(`/items/${itemId}`)}`
    )
  }
}

/**
 * Housekeeping that would normally be a cron job, run cheaply on page loads:
 *  - reservations not handed over within 24h expire and free the item
 *  - waitlist holds that ran out pass to the next person
 */
export async function runHousekeeping() {
  try {
    const cutoff = new Date(Date.now() - RULES.reserveHoldHours * HOUR)
    const stale = await prisma.loan.findMany({
      where: { status: "RESERVED", createdAt: { lt: cutoff } },
      select: { id: true, itemId: true },
      take: 25,
    })
    for (const loan of stale) {
      const freed = await prisma.$transaction(async (tx) => {
        const moved = await tx.loan.updateMany({
          where: { id: loan.id, status: "RESERVED" },
          data: { status: "EXPIRED", closedAt: new Date() },
        })
        if (moved.count !== 1) return false
        await tx.item.update({ where: { id: loan.itemId }, data: { status: "AVAILABLE" } })
        return true
      })
      if (freed) await promoteWaitlist(loan.itemId)
    }

    const lapsed = await prisma.item.findMany({
      where: { status: "AVAILABLE", holdUntil: { lt: new Date() } },
      select: { id: true },
      take: 25,
    })
    for (const item of lapsed) {
      await prisma.item.update({ where: { id: item.id }, data: { holdUserId: null, holdUntil: null } })
      await promoteWaitlist(item.id)
    }
  } catch (e) {
    console.error("housekeeping failed", e)
  }
}
