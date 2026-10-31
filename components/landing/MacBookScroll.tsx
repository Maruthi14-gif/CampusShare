"use client"

import { useEffect, useRef } from "react"

export type ScreenItem = {
  id: string
  title: string
  code: string
  category: string
  meetSpot: string
  photo: string | null
}

const TINT: Record<string, string> = {
  Calculator: "bg-indigo-50 text-indigo-600",
  "Lab coat": "bg-emerald-50 text-emerald-700",
  "Drafter / drawing kit": "bg-rose-50 text-rose-600",
  Book: "bg-amber-50 text-amber-700",
}

/**
 * Aceternity-style "MacBook scroll": as the page scrolls, the lid straightens
 * and the real Browse page on the screen grows towards you.
 *
 * Everything is visible before any script runs (the lid simply rests at a
 * slight angle). GSAP is downloaded only here, after the page has painted,
 * and never for students whose device asks for reduced motion.
 */
export function MacBookScroll({ items }: { items: ScreenItem[] }) {
  const stage = useRef<HTMLDivElement>(null)
  const lid = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (!window.matchMedia("(min-width: 768px)").matches) return // phones: no pinning

    let cleanup = () => {}
    let cancelled = false
    ;(async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")])
      if (cancelled || !stage.current) return
      gsap.registerPlugin(ScrollTrigger)

      const lenis = window.__lenis
      const onScroll = () => ScrollTrigger.update()
      lenis?.on("scroll", onScroll)

      const ctx = gsap.context(() => {
        gsap
          .timeline({
            scrollTrigger: { trigger: stage.current, start: "top 75%", end: "bottom bottom", scrub: 0.6 },
          })
          .fromTo(lid.current, { rotateX: -28, scale: 0.88 }, { rotateX: 0, scale: 1.06, ease: "none" })
      }, stage)

      cleanup = () => {
        lenis?.off("scroll", onScroll)
        ctx.revert()
      }
    })()

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  return (
    <div ref={stage} className="relative md:h-[200vh]" aria-label="A preview of the Browse page">
      <div className="flex items-center justify-center overflow-hidden px-4 py-6 [perspective:1600px] md:sticky md:top-[4.5rem] md:h-[calc(100vh-4.5rem)] md:min-h-[34rem]">
        <div className="w-full max-w-[58rem] [transform-style:preserve-3d]">
          {/* lid */}
          <div
            ref={lid}
            className="origin-bottom rounded-t-[1.1rem] rounded-b-md bg-slate-400 p-[1.4%] shadow-[0_30px_80px_-30px_rgb(18_20_43/0.45)] [transform-style:preserve-3d] md:[transform:rotateX(-28deg)_scale(0.88)]"
          >
            <div className="aspect-[16/10.4] overflow-hidden rounded-[0.65rem] bg-ink">
              <div className="h-full bg-paper text-ink">
                <div className="flex items-center gap-2.5 border-b border-slate-200 bg-white px-3 py-2 text-[clamp(8px,1.1vw,12px)]">
                  <span className="grid h-[1.9em] w-[1.9em] place-items-center rounded-md bg-indigo-600 font-display text-[0.8em] font-bold text-white">
                    CS
                  </span>
                  <b className="font-display">CampusShare</b>
                  <span className="text-slate-500">Browse</span>
                  <span className="text-slate-500">Requests</span>
                  <span className="ml-auto rounded-md bg-ink px-2 py-1 font-semibold text-white">+ Lend an item</span>
                </div>
                <div className="space-y-[2%] p-[2.5%]">
                  <p className="font-display text-[clamp(11px,2vw,22px)] font-bold tracking-tight">Free to borrow right now</p>
                  <div className="grid grid-cols-2 gap-[2%] sm:grid-cols-4">
                    {items.map((it) => (
                      <div key={it.id} className="space-y-[6%] rounded-lg border border-slate-200 bg-white p-[5%]">
                        {it.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.photo} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-md object-cover" />
                        ) : (
                          <div className={`grid aspect-[4/3] place-items-center rounded-md font-mono text-[clamp(8px,1.2vw,13px)] font-bold ${TINT[it.category] ?? "bg-slate-100 text-slate-700"}`}>
                            {it.code}
                          </div>
                        )}
                        <p className="truncate text-[clamp(8px,1vw,12px)] font-semibold">{it.title}</p>
                        <p className="truncate font-mono text-[clamp(7px,0.85vw,10px)] text-slate-500">
                          {it.code} · {it.meetSpot}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* base */}
          <div className="relative -mx-[6%] h-[clamp(10px,2.2vw,22px)] rounded-b-[1.4rem] bg-gradient-to-b from-slate-300 to-slate-400">
            <span className="absolute left-1/2 top-0 h-[35%] w-[16%] -translate-x-1/2 rounded-b-lg bg-slate-400" />
          </div>
        </div>
      </div>
    </div>
  )
}
