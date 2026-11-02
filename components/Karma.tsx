import Link from "next/link"
import { KARMA, LEVELS, PERKS, type Karma, type Level, type Thanks } from "@/lib/karma"

/* ── Level badge: a small ink stamp, louder as the level rises ── */

const BADGE: Record<Level, string> = {
  Newcomer: "border-slate-300 text-slate-600",
  Helper: "border-emerald-600 text-emerald-700",
  "Trusted lender": "border-indigo-600 text-indigo-700",
  "Campus champion": "border-stamp text-stamp -rotate-3",
}

export function LevelBadge({ level, className = "" }: { level: Level; className?: string }) {
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-md border-[1.5px] bg-white px-1.5 py-px font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] ${BADGE[level]} ${className}`}
    >
      {level}
    </span>
  )
}

/* ── The karma card on the profile page ── */

export function KarmaCard({ karma }: { karma: Karma }) {
  const { points, level, next } = karma
  const floor = LEVELS.find((l) => l.name === level)!.min
  const pct = next ? Math.round(((points - floor) / (next.at - floor)) * 100) : 100

  const rows = [
    { label: "Items you lent", n: karma.lent, each: KARMA.lendDone },
    { label: "Days your items were out", n: karma.daysLent, each: KARMA.perDayLent },
    { label: "Requests you answered", n: karma.requestsAnswered, each: KARMA.requestBonus },
    { label: "Returned on time", n: karma.onTime, each: KARMA.onTimeReturn },
    { label: "Late, damaged or lost", n: karma.penalties, each: KARMA.penalty },
  ]

  return (
    <section aria-labelledby="karma-h" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr] sm:items-end">
        <div>
          <h2 id="karma-h" className="text-sm font-semibold text-slate-600">
            Your karma
          </h2>
          <p className="mt-1 font-display text-6xl font-extrabold leading-none tracking-[-0.04em] text-ink">
            {points}
            <span className="ml-2 align-middle text-base font-semibold tracking-normal text-slate-500">points</span>
          </p>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <LevelBadge level={level} />
            <span className="text-xs text-slate-600">
              {next ? `${next.at - points} more to ${next.name}` : "Top level reached"}
            </span>
          </div>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label={next ? `Progress to ${next.name}` : "Top level"}
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.max(4, pct)}%` }} />
          </div>
        </div>
      </div>

      <div className="grid border-t border-dashed border-slate-200 sm:grid-cols-2">
        <div className="p-6 sm:border-r sm:border-dashed sm:border-slate-200">
          <h3 className="text-sm font-semibold text-ink">What your points unlock</h3>
          <ul className="mt-3 grid gap-2.5">
            {PERKS.map((p) => {
              const on = points >= p.at
              return (
                <li key={p.title} className="flex gap-3">
                  <span
                    aria-hidden
                    className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                      on ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {on ? "✓" : "·"}
                  </span>
                  <span className="text-sm">
                    <span className={on ? "font-semibold text-ink" : "font-semibold text-slate-600"}>{p.title}</span>
                    <span className="block text-slate-600">
                      {on ? p.body : `Unlocks at ${p.at} points. ${p.body}`}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="p-6">
          <h3 className="text-sm font-semibold text-ink">How you earned them</h3>
          <dl className="mt-3 divide-y divide-dashed divide-slate-200 text-sm">
            {rows.map((r) => (
              <div key={r.label} className="flex items-center justify-between gap-3 py-1.5">
                <dt className="text-slate-600">
                  {r.label} <span className="font-mono text-xs text-slate-500">× {r.n}</span>
                </dt>
                <dd className={`font-mono font-semibold ${r.each < 0 && r.n ? "text-stamp" : "text-ink"}`}>
                  {r.n * r.each > 0 ? "+" : ""}
                  {r.n * r.each}
                </dd>
              </div>
            ))}
          </dl>
          <Link href="/leaderboard" className="mt-3 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            See this month&apos;s leaderboard →
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ── Thank-you notes from borrowers ── */

export function ThanksList({ thanks, emptyHint }: { thanks: Thanks[]; emptyHint?: string }) {
  if (thanks.length === 0)
    return emptyHint ? <p className="text-sm text-slate-600">{emptyHint}</p> : null
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {thanks.map((t, i) => (
        <li key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="font-display text-lg font-semibold leading-snug tracking-[-0.01em] text-ink">“{t.note}”</p>
          <p className="mt-2 text-xs text-slate-600">
            {t.from} · borrowed your {t.item}
          </p>
        </li>
      ))}
    </ul>
  )
}

/* ── The points table, shared by the leaderboard and the lend page ── */

export function HowPointsWork() {
  const rules = [
    ["Lend an item and get it back fine", `+${KARMA.lendDone}`],
    ["Each day it was out (up to 14)", `+${KARMA.perDayLent}`],
    ["Lend it in answer to a request", `+${KARMA.requestBonus}`],
    ["Return something on time", `+${KARMA.onTimeReturn}`],
    ["Return late, damaged or lose it", `${KARMA.penalty}`],
  ]
  return (
    <dl className="divide-y divide-dashed divide-slate-200 border-y border-dashed border-slate-200 text-sm">
      {rules.map(([k, v]) => (
        <div key={k} className="flex items-center justify-between gap-3 py-2">
          <dt className="text-slate-600">{k}</dt>
          <dd className={`font-mono font-semibold ${v.startsWith("-") ? "text-stamp" : "text-ink"}`}>{v}</dd>
        </div>
      ))}
    </dl>
  )
}
