/**
 * Karma: why students lend.
 *
 * Points are WORKED OUT from loan history every time, never stored, so
 * they can't drift out of step with what really happened and nobody can
 * edit their own score. Points never gate borrowing; they only unlock
 * extras (a third item, waitlist priority) and recognition.
 */
import { prisma } from "@/lib/prisma"

export const KARMA = {
  lendDone: 10, // a loan you lent closed with the item fine
  perDayLent: 2, // each day it was out, up to 14
  requestBonus: 5, // you lent it in answer to someone's request
  onTimeReturn: 3, // as a borrower, you returned it by the due date
  penalty: -10, // as a borrower: late, damaged or lost
} as const

export const LEVELS = [
  { min: 0, name: "Newcomer" },
  { min: 25, name: "Helper" },
  { min: 50, name: "Trusted lender" },
  { min: 100, name: "Campus champion" },
] as const

/** Points at which the perks switch on. */
export const PERK_AT = 50

export const PERKS = [
  { at: PERK_AT, title: "Borrow 3 items at once", body: "Everyone else can hold 2." },
  { at: PERK_AT, title: "First in line on waitlists", body: "Busy items are held for you before others." },
  { at: 25, title: "Helper badge", body: "Shown on your items and your requests." },
  { at: 100, title: "Campus champion badge", body: "The top badge on campus." },
] as const

export type Level = (typeof LEVELS)[number]["name"]

export type Thanks = { note: string; from: string; item: string; at: Date }

export type Karma = {
  points: number
  level: Level
  next: { name: Level; at: number } | null
  lent: number
  daysLent: number
  requestsAnswered: number
  onTime: number
  penalties: number
  thanks: Thanks[]
}

const DAY = 86_400_000

export function levelFor(points: number): { level: Level; next: { name: Level; at: number } | null } {
  let i = 0
  for (let k = 0; k < LEVELS.length; k++) if (points >= LEVELS[k].min) i = k
  const next = LEVELS[i + 1]
  return { level: LEVELS[i].name, next: next ? { name: next.name, at: next.min } : null }
}

function daysOut(issuedAt: Date | null, returnedAt: Date | null) {
  if (!issuedAt || !returnedAt) return 1
  return Math.min(14, Math.max(1, Math.ceil((returnedAt.getTime() - issuedAt.getTime()) / DAY)))
}

/** One student's karma, with the breakdown and their latest thank-you notes. */
export async function karmaFor(userId: string): Promise<Karma> {
  const [lentLoans, borrowedLoans] = await Promise.all([
    prisma.loan.findMany({
      where: { item: { ownerId: userId }, status: "VERIFIED" },
      select: {
        id: true,
        issuedAt: true,
        returnedAt: true,
        verifiedAt: true,
        thanksNote: true,
        borrower: { select: { name: true } },
        item: { select: { title: true } },
      },
      orderBy: { verifiedAt: "desc" },
    }),
    prisma.loan.findMany({
      where: { borrowerId: userId, status: { in: ["VERIFIED", "PROBLEM", "LOST"] } },
      select: { status: true, dueAt: true, returnedAt: true },
    }),
  ])
  const requestsAnswered = lentLoans.length
    ? await prisma.request.count({ where: { loanId: { in: lentLoans.map((l) => l.id) } } })
    : 0

  const daysLent = lentLoans.reduce((sum, l) => sum + daysOut(l.issuedAt, l.returnedAt), 0)
  const onTime = borrowedLoans.filter((l) => l.status === "VERIFIED" && l.returnedAt && l.returnedAt <= l.dueAt).length
  const penalties = borrowedLoans.filter(
    (l) => l.status !== "VERIFIED" || (l.returnedAt && l.returnedAt > l.dueAt)
  ).length

  const raw =
    lentLoans.length * KARMA.lendDone +
    daysLent * KARMA.perDayLent +
    requestsAnswered * KARMA.requestBonus +
    onTime * KARMA.onTimeReturn +
    penalties * KARMA.penalty
  const points = Math.max(0, raw)

  const thanks = lentLoans
    .filter((l) => l.thanksNote)
    .slice(0, 5)
    .map((l) => ({
      note: l.thanksNote!,
      from: l.borrower.name?.split(" ")[0] ?? "A student",
      item: l.item.title,
      at: l.verifiedAt ?? l.returnedAt ?? new Date(),
    }))

  return { points, ...levelFor(points), lent: lentLoans.length, daysLent, requestsAnswered, onTime, penalties, thanks }
}

/** Just the number, for rules like the borrow limit and waitlist order. */
export async function pointsFor(userId: string) {
  return (await karmaFor(userId)).points
}

export type LeaderRow = { userId: string; name: string; hostel: string | null; points: number; lent: number }

/**
 * This month's lenders and hostels. Only lending is ranked, never borrowing:
 * nobody is shamed for needing things.
 */
export async function monthlyBoard(now = new Date()) {
  // The 1st of this month, midnight in India (the server itself runs on UTC).
  const IST = 5.5 * 3_600_000
  const ist = new Date(now.getTime() + IST)
  const start = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST)
  const loans = await prisma.loan.findMany({
    where: { status: "VERIFIED", verifiedAt: { gte: start } },
    select: {
      id: true,
      issuedAt: true,
      returnedAt: true,
      item: { select: { owner: { select: { id: true, name: true, hostel: true } } } },
    },
  })
  const answered = new Set(
    loans.length
      ? (await prisma.request.findMany({ where: { loanId: { in: loans.map((l) => l.id) } }, select: { loanId: true } })).map(
          (r) => r.loanId
        )
      : []
  )

  const byUser = new Map<string, LeaderRow>()
  const byHostel = new Map<string, number>()
  for (const l of loans) {
    const o = l.item.owner
    const row = byUser.get(o.id) ?? { userId: o.id, name: o.name ?? "A student", hostel: o.hostel, points: 0, lent: 0 }
    row.lent += 1
    row.points += KARMA.lendDone + daysOut(l.issuedAt, l.returnedAt) * KARMA.perDayLent + (answered.has(l.id) ? KARMA.requestBonus : 0)
    byUser.set(o.id, row)
    if (o.hostel) byHostel.set(o.hostel, (byHostel.get(o.hostel) ?? 0) + 1)
  }
  const leaders = [...byUser.values()].sort((a, b) => b.points - a.points || b.lent - a.lent).slice(0, 10)
  return { start, leaders, byHostel, total: loans.length }
}
