"use client"

import { useEffect, useRef } from "react"

const STEPS = [
  { title: "Priya reserves it", body: "Only Priya sees the code 3168. The lender never does." },
  { title: "They meet", body: "Same hostel: at the lender's room. Different hostels: a busy spot like the library door." },
  { title: "The lender types 3168", body: "With a photo of the item. The calculator is now with Priya." },
  { title: "Back with a second code", body: "Priya returns it and types the lender's code, with a second photo." },
]

/**
 * The one loud moment on the landing page: the pickup code lands like a
 * library "date due" stamp. It is fully visible at rest; the stamp only
 * replays its landing once when the section scrolls into view.
 */
export function Handover({ meetAt }: { meetAt: string }) {
  const stamp = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = stamp.current
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("stamp-land")
          io.disconnect()
        }
      },
      { threshold: 0.6 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section id="how" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-24">
      <h2 className="max-w-[18ch] font-display text-[clamp(2rem,4.4vw,3.2rem)] font-extrabold leading-[1.02] tracking-[-0.03em] text-ink">
        The handover, stamped like a library slip.
      </h2>
      <p className="mt-3 max-w-[56ch] text-slate-600">
        Two people, two one-time codes, two photos. Nobody can be handed an item, or claim it came back, without the other
        person&apos;s code.
      </p>

      <div className="mt-12 grid items-center gap-10 md:grid-cols-2">
        <article
          aria-label="Example loan slip"
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6"
        >
          <header className="flex items-baseline justify-between gap-3">
            <b className="font-display text-lg">Casio fx-991EX</b>
            <span className="font-mono text-xs text-slate-500">CS-1001</span>
          </header>
          <dl className="mt-4 divide-y divide-dashed divide-slate-200 border-y border-dashed border-slate-200 text-sm">
            {[
              ["Borrower", "Priya · 24BCS077"],
              ["Meet at", meetAt],
              ["Date due", "03 NOV · 19:44"],
            ].map(([k, v]) => (
              <div key={k} className="flex min-h-10 items-center justify-between gap-3">
                <dt className="text-slate-500">{k}</dt>
                <dd className={k === "Date due" ? "font-mono" : ""}>{v}</dd>
              </div>
            ))}
          </dl>
          <div
            ref={stamp}
            className="mt-6 inline-grid -rotate-6 gap-1 rounded-lg border-[3px] border-stamp px-4 py-2.5 text-center text-stamp"
          >
            <small className="font-mono text-[10px] font-bold tracking-[0.14em]">PICKUP CODE</small>
            <span className="font-mono text-[34px] font-bold leading-none tracking-[0.22em]">3168</span>
          </div>
        </article>

        <ol className="grid gap-5">
          {STEPS.map((s, i) => (
            <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3">
              <span className="pt-0.5 font-mono text-sm font-bold text-indigo-600">{i + 1}</span>
              <div>
                <p className="font-semibold text-ink">{s.title}</p>
                <p className="text-[15px] text-slate-600">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
