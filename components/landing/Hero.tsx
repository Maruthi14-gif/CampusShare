"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from "motion/react"

// The swap is the only motion in the hero. The headline itself is visible
// the moment the page loads, so it never delays the first paint.
const ROTATE = [
  { thing: "calculator", tail: "for one exam?" },
  { thing: "lab coat", tail: "for one lab?" },
  { thing: "drafter", tail: "for one sem?" },
  { thing: "textbook", tail: "for one course?" },
]

const EASE = [0.22, 1, 0.36, 1] as const

export function Hero({ available, hostels }: { available: number; hostels: string }) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setI((v) => (v + 1) % ROTATE.length), 2800)
    return () => clearInterval(t)
  }, [reduce])

  const swap = {
    initial: { y: "100%", opacity: 0 },
    animate: { y: "0%", opacity: 1 },
    exit: { y: "-100%", opacity: 0 },
    transition: { duration: 0.5, ease: EASE },
  }

  return (
    <MotionConfig reducedMotion="user">
      <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:pt-20">
        <Link
          href="/items"
          className="inline-flex items-center gap-2.5 font-mono text-[13px] text-slate-600 transition hover:text-ink"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {available} {available === 1 ? "item" : "items"} free to borrow right now →
        </Link>

        <h1
          className="mt-6 max-w-[15ch] font-display text-[clamp(2.6rem,7.4vw,5.4rem)] font-extrabold leading-[0.98] tracking-[-0.035em] text-ink"
          aria-label={`Why buy a ${ROTATE[i].thing} ${ROTATE[i].tail}`}
        >
          <span aria-hidden className="block">
            Why buy a
          </span>
          <span aria-hidden className="relative block h-[1.08em] overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.span key={ROTATE[i].thing} {...swap} className="absolute inset-x-0 top-0 whitespace-nowrap text-indigo-600">
                {ROTATE[i].thing}
              </motion.span>
            </AnimatePresence>
          </span>
          <span aria-hidden className="relative block h-[1.08em] overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.span
                key={ROTATE[i].tail}
                {...swap}
                transition={{ ...swap.transition, delay: 0.05 }}
                className="absolute inset-x-0 top-0 whitespace-nowrap"
              >
                {ROTATE[i].tail}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-slate-600">
          Borrow it from someone in {hostels}, and hand it back after the exam. Only @iiitdwd.ac.in accounts, no
          deposit, free to use.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/items"
            className="inline-flex h-12 items-center rounded-xl bg-ink px-6 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            Browse what&apos;s free
          </Link>
          <Link
            href="/#how"
            className="inline-flex h-12 items-center rounded-xl bg-white px-6 text-sm font-semibold text-ink ring-1 ring-slate-200 transition hover:ring-slate-300 active:scale-[0.98]"
          >
            How the handover works
          </Link>
        </div>
      </section>
    </MotionConfig>
  )
}
