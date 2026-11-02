import Link from "next/link"
import { auth } from "@/auth"
import { HOSTELS } from "@/lib/campus"
import { PERK_AT, monthlyBoard } from "@/lib/karma"
import { HowPointsWork } from "@/components/Karma"

export const dynamic = "force-dynamic"

export default async function LeaderboardPage() {
  const session = await auth()
  const board = await monthlyBoard()
  const month = board.start.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" })

  const hostels = HOSTELS.map((h) => ({ name: h, n: board.byHostel.get(h) ?? 0 }))
  const top = Math.max(1, ...hostels.map((h) => h.n))
  const leading = hostels.filter((h) => h.n === top && h.n > 0)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-10">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink sm:text-5xl">Leaderboard</h1>
      <p className="mt-2 text-sm text-slate-600">
        {month} · counts loans that closed this month · starts again on the 1st. Only lending is ranked.
      </p>

      {/* ── hostel battle ── */}
      <section aria-labelledby="battle-h" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="battle-h" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
            Hostel vs hostel
          </h2>
          <p className="text-sm text-slate-600">
            {board.total === 0
              ? "No loans closed yet this month. The first one puts your hostel ahead."
              : leading.length === 1
                ? `${leading[0].name} is ahead`
                : "It's a tie"}
          </p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {hostels.map((h) => {
            const lead = h.n === top && h.n > 0 && leading.length === 1
            return (
              <div key={h.name} className={`rounded-xl p-5 ${lead ? "bg-indigo-50" : "bg-paper"}`}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold text-ink">{h.name}</p>
                  {lead && (
                    <span className="-rotate-6 rounded-md border-2 border-stamp bg-white px-2 py-0.5 font-mono text-[11px] font-bold tracking-[0.12em] text-stamp">
                      LEADING
                    </span>
                  )}
                </div>
                <p className="mt-2 font-display text-5xl font-extrabold leading-none tracking-[-0.04em] text-ink">{h.n}</p>
                <p className="mt-1 text-sm text-slate-600">{h.n === 1 ? "item lent" : "items lent"} this month</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white" aria-hidden>
                  <div className="h-full rounded-full bg-indigo-600" style={{ width: `${(h.n / top) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* ── top lenders ── */}
        <section aria-labelledby="top-h" className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 id="top-h" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
            Top lenders this month
          </h2>
          {!session?.user ? (
            <p className="mt-4 text-sm text-slate-600">
              <Link href="/signin?callbackUrl=%2Fleaderboard" className="font-semibold text-indigo-600">
                Sign in
              </Link>{" "}
              with your institute account to see names.
            </p>
          ) : board.leaders.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              Nobody yet. Lend something this week and you&apos;re first.{" "}
              <Link href="/items/new" className="font-semibold text-indigo-600">
                Lend an item →
              </Link>
            </p>
          ) : (
            <ol className="mt-4 divide-y divide-dashed divide-slate-200">
              {board.leaders.map((r, i) => (
                <li key={r.userId} className="flex items-center gap-4 py-3">
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-mono text-sm font-bold ${
                      i === 0 ? "bg-ink text-white" : i < 3 ? "bg-indigo-50 text-indigo-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{r.name}</span>
                    <span className="block text-xs text-slate-600">
                      {r.hostel ?? "Hostel not set"} · {r.lent} {r.lent === 1 ? "item" : "items"} lent
                    </span>
                  </span>
                  <span className="font-mono text-lg font-bold text-ink">{r.points}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* ── how points work ── */}
        <section aria-labelledby="how-h" className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 id="how-h" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
            How points work
          </h2>
          <div className="mt-4">
            <HowPointsWork />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            At {PERK_AT} points you can borrow 3 items at once and you&apos;re first in line on waitlists. Points never stop
            anyone from borrowing.
          </p>
        </section>
      </div>
    </div>
  )
}
