"use client"

import Link from "next/link"
import { useEffect, useRef, useState, type ReactNode } from "react"
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"
import { cn } from "@/lib/utils"

export type FeaturedItem = {
  id: string
  title: string
  category: string
  code: string
  meetSpot: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export function Landing({
  available,
  total,
  featured,
}: {
  available: number
  total: number
  featured: FeaturedItem[]
}) {
  return (
    // reducedMotion="user": phones set to "reduce motion" get no movement
    <MotionConfig reducedMotion="user">
    <div className="overflow-x-clip">
      <Hero available={available} featured={featured} />
      <Marquee />
      <Story />
      <Bento />
      <Numbers total={total} />
      <FinalCta />
    </div>
    </MotionConfig>
  )
}

/* ════════════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════════════ */

const ROTATE = [
  { thing: "calculator", tail: "for one exam?" },
  { thing: "lab coat", tail: "for one lab?" },
  { thing: "drafter", tail: "for one sem?" },
  { thing: "textbook", tail: "for one course?" },
]

function Hero({ available, featured }: { available: number; featured: FeaturedItem[] }) {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)

  useEffect(() => {
    if (reduce) return
    const t = setInterval(() => setI((v) => (v + 1) % ROTATE.length), 2600)
    return () => clearInterval(t)
  }, [reduce])

  const swap = {
    initial: { y: "105%", opacity: 0, filter: "blur(8px)" },
    animate: { y: "0%", opacity: 1, filter: "blur(0px)" },
    exit: { y: "-105%", opacity: 0, filter: "blur(8px)" },
    transition: { duration: 0.55, ease: EASE },
  }

  return (
    <section className="relative isolate">
      <Aurora />

      <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-20 pt-14 sm:pt-20 lg:grid-cols-[1.15fr_1fr] lg:pb-28">
        <div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <Link
              href="/items"
              className="group inline-flex items-center gap-2.5 rounded-full bg-white/80 py-1.5 pl-2.5 pr-3.5
                         text-xs font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur
                         transition hover:ring-indigo-300"
            >
              <LiveDot />
              <span>
                <strong className="font-semibold text-slate-900">{available}</strong>{" "}
                {available === 1 ? "item" : "items"} free to borrow right now
              </span>
              <span className="text-indigo-600 transition group-hover:translate-x-0.5">→</span>
            </Link>
          </motion.div>

          <h1
            className="mt-7 font-display text-[clamp(2.4rem,7.2vw,4.6rem)] font-bold leading-[1.02] tracking-[-0.035em] text-slate-950"
            aria-label={`Why buy a ${ROTATE[i].thing} ${ROTATE[i].tail}`}
          >
            <span aria-hidden className="block">
              <Words text="Why buy a" />
            </span>
            <span aria-hidden className="relative block h-[1.12em] overflow-hidden">
              <AnimatePresence initial={false}>
                <motion.span
                  key={ROTATE[i].thing}
                  {...swap}
                  className="absolute inset-x-0 top-0 whitespace-nowrap bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-500 bg-clip-text pb-1 text-transparent"
                >
                  {ROTATE[i].thing}
                </motion.span>
              </AnimatePresence>
            </span>
            <span aria-hidden className="relative block h-[1.12em] overflow-hidden">
              <AnimatePresence initial={false}>
                <motion.span
                  key={ROTATE[i].tail}
                  {...swap}
                  transition={{ ...swap.transition, delay: 0.06 }}
                  className="absolute inset-x-0 top-0 whitespace-nowrap"
                >
                  {ROTATE[i].tail}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: EASE }}
            className="mt-7 max-w-lg text-lg leading-relaxed text-slate-600"
          >
            Borrow it from someone on campus. Lend yours when you&apos;re done. CampusShare puts
            the stuff sitting in hostel cupboards back into circulation.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: EASE }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <PrimaryLink href="/items">Browse what&apos;s free</PrimaryLink>
            <Link
              href="/items/new"
              className="inline-flex h-12 items-center rounded-2xl bg-white px-6 text-sm font-semibold text-slate-800
                         shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
            >
              Lend something
            </Link>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500"
          >
            {["Only @iiitdwd.ac.in", "No deposit", "Free to use"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <CheckIcon className="h-4 w-4 text-emerald-500" />
                {t}
              </li>
            ))}
          </motion.ul>
        </div>

        <HeroCards featured={featured} />
      </div>
    </section>
  )
}

/** Each word blurs and rises into place, one after another. */
function Words({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <>
      {text.split(" ").map((w, i) => (
        <motion.span
          key={i}
          className="mr-[0.22em] inline-block"
          initial={{ opacity: 0, y: "0.35em", filter: "blur(10px)" }}
          animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
          transition={{ duration: 0.6, delay: delay + i * 0.08, ease: EASE }}
        >
          {w}
        </motion.span>
      ))}
    </>
  )
}

function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* faint graph-paper grid, fading out from the centre */}
      <div
        className="absolute inset-0 opacity-[0.5]
                   [background-image:linear-gradient(to_right,rgb(99_102_241/0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgb(99_102_241/0.08)_1px,transparent_1px)]
                   [background-size:44px_44px]
                   [mask-image:radial-gradient(ellipse_70%_60%_at_50%_30%,black,transparent)]"
      />
      <div className="absolute -left-[10%] -top-[30%] h-[42rem] w-[42rem] rounded-full bg-[radial-gradient(circle,rgb(99_102_241/0.28),transparent_62%)] animate-[aurora_18s_ease-in-out_infinite]" />
      <div className="absolute -right-[15%] top-[-10%] h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle,rgb(217_70_239/0.18),transparent_62%)] animate-[aurora_22s_ease-in-out_infinite_reverse]" />
      <div className="absolute bottom-[-35%] left-[30%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgb(56_189_248/0.16),transparent_62%)] animate-[aurora_26s_ease-in-out_infinite]" />
    </div>
  )
}

/* ── floating 3D cards ─────────────────────────────────────────── */

const SAMPLE: FeaturedItem[] = [
  { id: "", title: "Casio FX-991EX calculator", category: "Calculator", code: "CS-1001", meetSpot: "Library entrance" },
  { id: "", title: "White lab coat (size M)", category: "Lab coat", code: "CS-1002", meetSpot: "Academic block lobby" },
]

function HeroCards({ featured }: { featured: FeaturedItem[] }) {
  const reduce = useReducedMotion()
  const items = [...featured, ...SAMPLE].slice(0, 2)

  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18 })
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 18 })

  function onMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - r.left) / r.width - 0.5)
    my.set((e.clientY - r.top) / r.height - 0.5)
  }

  return (
    <div
      onPointerMove={onMove}
      onPointerLeave={() => {
        mx.set(0)
        my.set(0)
      }}
      className="relative mx-auto h-[25rem] w-full max-w-md [perspective:1200px] sm:h-[28rem]"
    >
      <motion.div style={{ rotateX, rotateY }} className="relative h-full w-full [transform-style:preserve-3d]">
        {/* glow behind the stack */}
        <div className="absolute inset-[12%] rounded-full bg-gradient-to-br from-indigo-400/40 via-violet-400/30 to-fuchsia-400/30 blur-3xl" />

        <Floating className="left-0 top-[4%] w-[78%]" depth={60} tilt={-6} delay={0.35} reduce={reduce}>
          <ItemCard item={items[0]} />
        </Floating>

        <Floating className="right-0 top-[37%] w-[74%]" depth={20} tilt={5} delay={0.5} reduce={reduce} float={7}>
          <ItemCard item={items[1]} />
        </Floating>

        <Floating className="bottom-[2%] left-[8%] w-[70%]" depth={90} tilt={-2} delay={0.7} reduce={reduce} float={5}>
          <ReservedToast place={items[0].meetSpot} />
        </Floating>
      </motion.div>
    </div>
  )
}

function Floating({
  children,
  className,
  depth,
  tilt,
  delay,
  reduce,
  float = 6,
}: {
  children: ReactNode
  className: string
  depth: number
  tilt: number
  delay: number
  reduce: boolean | null
  float?: number
}) {
  return (
    <motion.div
      className={cn("absolute", className)}
      style={{ translateZ: depth }}
      initial={{ opacity: 0, y: 40, rotate: tilt * 2, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotate: tilt, scale: 1 }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      <motion.div
        animate={reduce ? undefined : { y: [0, -12, 0] }}
        transition={{ duration: float, repeat: Infinity, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

function ItemCard({ item }: { item: FeaturedItem }) {
  const body = (
    <div className="rounded-3xl bg-white/95 p-4 shadow-[0_20px_50px_-12px_rgb(30_27_75/0.25)] ring-1 ring-slate-900/5 backdrop-blur transition hover:ring-indigo-300">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
          {item.category}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          available
        </span>
      </div>
      <p className="mt-3 line-clamp-1 font-display text-lg font-semibold tracking-tight text-slate-900">
        {item.title}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <MiniQR seed={item.code} className="h-12 w-12" />
        <div className="text-xs leading-relaxed text-slate-500">
          <p className="font-mono font-semibold tracking-widest text-slate-800">{item.code}</p>
          <p>{`Handover: ${item.meetSpot}`}</p>
        </div>
      </div>
    </div>
  )
  return item.id ? (
    <Link href={`/items/${item.id}`} aria-label={item.title}>
      {body}
    </Link>
  ) : (
    body
  )
}

function ReservedToast({ place }: { place: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-950 p-3.5 pr-5 text-white shadow-2xl shadow-indigo-950/30">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
        <CheckIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">Reserved for 3 days</p>
        <p className="truncate text-xs text-slate-400">
          Pickup code <span className="font-mono tracking-[0.2em] text-white">4821</span>
          {` · ${place}`}
        </p>
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   MARQUEE
   ════════════════════════════════════════════════════════════════ */

const THINGS = [
  "Scientific calculators",
  "Lab coats",
  "Mini drafters",
  "Engineering textbooks",
  "Laptop chargers",
  "Multimeters",
  "Badminton rackets",
  "Breadboards",
  "Arduino kits",
  "Umbrellas",
]

function Marquee() {
  return (
    <section
      aria-label="Things students lend on CampusShare"
      className="group relative border-y border-slate-200/80 bg-white py-5
                 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]"
    >
      <div className="flex w-max animate-[marquee_38s_linear_infinite] group-hover:[animation-play-state:paused]">
        {[0, 1].map((copy) => (
          <ul key={copy} aria-hidden={copy === 1} className="flex shrink-0 items-center">
            {THINGS.map((t) => (
              <li key={t} className="flex items-center whitespace-nowrap font-display text-xl font-semibold tracking-tight text-slate-400">
                <span className="px-7 transition-colors hover:text-slate-900">{t}</span>
                <span className="text-indigo-400">✦</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   STORY — phone changes screen as you scroll (pinned on desktop)
   ════════════════════════════════════════════════════════════════ */

const STEPS = [
  {
    t: "Tag it",
    d: "List the item in under a minute. Print the QR tag for ₹0.60 and stick it on.",
    screen: <TagScreen />,
  },
  {
    t: "Book it",
    d: "Classmates see what's free right now and reserve it. Only they get a 4-digit pickup code, like a delivery OTP.",
    screen: <BookScreen />,
  },
  {
    t: "Meet & swap",
    d: "Same hostel? At your room. Otherwise a busy spot like the library. You type their code, they get the item.",
    screen: <DropScreen />,
  },
  {
    t: "Get it back",
    d: "They hand it back and type your return code. Two photos prove the condition. Done.",
    screen: <ReturnScreen />,
  },
]

function Story() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] })
  const [step, setStep] = useState(0)
  useMotionValueEvent(scrollYProgress, "change", (v) =>
    setStep(Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length))))
  )
  const bar = useSpring(scrollYProgress, { stiffness: 140, damping: 24 })

  const heading = (
    <div className="max-w-xl">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">How it works</p>
      <h2 className="mt-3 font-display text-4xl font-bold tracking-[-0.03em] text-slate-950 sm:text-5xl">
        From your cupboard to a classmate in four steps.
      </h2>
    </div>
  )

  return (
    <section ref={ref} id="how" className="relative scroll-mt-20 lg:h-[340vh]">
      {/* ── desktop: pinned, scroll drives the phone ── */}
      <div className="sticky top-[4.25rem] hidden h-[calc(100vh-4.25rem)] min-h-[40rem] items-center lg:flex">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto] items-center gap-16 px-4">
          <div>
            {heading}
            <div className="relative mt-10 pl-8">
              <div className="absolute bottom-2 left-[7px] top-2 w-0.5 rounded bg-slate-200" />
              <motion.div
                style={{ scaleY: bar }}
                className="absolute bottom-2 left-[7px] top-2 w-0.5 origin-top rounded bg-gradient-to-b from-indigo-500 to-fuchsia-500"
              />
              <ol className="space-y-7">
                {STEPS.map((s, i) => (
                  <li key={s.t} className="relative">
                    <span
                      className={cn(
                        "absolute -left-8 top-1 grid h-4 w-4 place-items-center rounded-full ring-4 ring-slate-50 transition-colors duration-300",
                        i <= step ? "bg-indigo-600" : "bg-slate-300"
                      )}
                    />
                    <h3
                      className={cn(
                        "font-display text-2xl font-semibold tracking-tight transition-colors duration-300",
                        i === step ? "text-slate-950" : "text-slate-400"
                      )}
                    >
                      <span className="mr-3 font-mono text-sm text-indigo-500">0{i + 1}</span>
                      {s.t}
                    </h3>
                    <motion.p
                      initial={false}
                      animate={{ height: i === step ? "auto" : 0, opacity: i === step ? 1 : 0 }}
                      transition={{ duration: 0.4, ease: EASE }}
                      className="overflow-hidden text-base leading-relaxed text-slate-600"
                    >
                      <span className="block pt-2">{s.d}</span>
                    </motion.p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <Phone>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.97 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="h-full"
              >
                {STEPS[step].screen}
              </motion.div>
            </AnimatePresence>
          </Phone>
        </div>
      </div>

      {/* ── phones & tablets: stacked cards ── */}
      <div className="mx-auto w-full max-w-2xl px-4 py-20 lg:hidden">
        {heading}
        <div className="mt-10 space-y-5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.t}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, ease: EASE }}
              className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200"
            >
              <div className="p-6">
                <h3 className="font-display text-2xl font-semibold tracking-tight">
                  <span className="mr-3 font-mono text-sm text-indigo-500">0{i + 1}</span>
                  {s.t}
                </h3>
                <p className="mt-2 leading-relaxed text-slate-600">{s.d}</p>
              </div>
              <div className="h-[26rem] border-t border-slate-100 bg-slate-50">{s.screen}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -inset-10 -z-10 rounded-full bg-gradient-to-br from-indigo-300/40 to-fuchsia-300/30 blur-3xl" />
      <div className="h-[36rem] w-[18rem] rounded-[3rem] bg-slate-950 p-3 shadow-2xl shadow-indigo-950/30 ring-1 ring-white/10">
        <div className="relative h-full overflow-hidden rounded-[2.4rem] bg-slate-50">
          <div className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-slate-950" />
          <div className="h-full pt-12">{children}</div>
        </div>
      </div>
    </div>
  )
}

/* ── the four phone screens ── */

function ScreenTitle({ children }: { children: ReactNode }) {
  return <p className="px-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{children}</p>
}

function TagScreen() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 px-5 py-6">
      <ScreenTitle>Your new tag</ScreenTitle>
      <div className="relative rounded-2xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
        <MiniQR seed="CS-1001" className="h-32 w-32" />
        <div
          className="absolute inset-x-3 top-3 h-0.5 rounded bg-indigo-500 shadow-[0_0_12px_2px_rgb(99_102_241/0.6)]
                     animate-[scanline_2.4s_ease-in-out_infinite] [--scan-distance:8.5rem]"
        />
        <p className="mt-3 text-center font-mono text-sm font-bold tracking-[0.25em]">CS-1001</p>
      </div>
      <p className="text-center text-sm text-slate-600">
        Casio FX-991EX
        <br />
        <span className="text-xs text-slate-400">3.5 × 2.5 cm · ₹0.60 to print</span>
      </p>
    </div>
  )
}

function BookScreen() {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 900)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-5 py-6">
      <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
        <div className="grid h-24 place-items-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-500">
          <CalcIcon className="h-12 w-12" />
        </div>
        <p className="mt-3 font-semibold">Casio FX-991EX</p>
        <p className="text-xs text-slate-500">Calculator · Library entrance</p>
      </div>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-200"
          >
            <p className="text-xs font-medium text-emerald-700">Reserved · pickup code</p>
            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.3em] text-emerald-900">4821</p>
          </motion.div>
        ) : (
          <motion.div
            key="btn"
            exit={{ opacity: 0, scale: 0.95 }}
            animate={{ scale: [1, 0.96, 1] }}
            transition={{ delay: 0.5, duration: 0.3 }}
            className="rounded-2xl bg-indigo-600 py-3.5 text-center text-sm font-semibold text-white"
          >
            Reserve for 3 days
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DropScreen() {
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-5 py-6">
      <ScreenTitle>Meet at · Library entrance</ScreenTitle>
      <div className="rounded-2xl bg-slate-950 p-4 text-center text-white">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Borrower&apos;s pickup code</p>
        <p className="mt-2 flex justify-center gap-1.5">
          {"4821".split("").map((d, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.12 }}
              className="grid h-10 w-8 place-items-center rounded-lg bg-white/10 font-mono text-xl font-bold"
            >
              {d}
            </motion.span>
          ))}
        </p>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-600">
          <CameraIcon className="h-5 w-5" />
        </span>
        <p className="text-xs leading-snug text-slate-600">Lender takes a photo and types the code</p>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200"
      >
        <CheckIcon className="h-5 w-5 text-emerald-600" />
        Code matches · handed over
      </motion.div>
    </div>
  )
}

function ReturnScreen() {
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-5 py-6">
      <ScreenTitle>Condition record</ScreenTitle>
      <div className="grid grid-cols-2 gap-2.5">
        {["At handover", "On return"].map((l, i) => (
          <motion.div
            key={l}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.25 }}
          >
            <div className="grid aspect-[4/5] place-items-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500 ring-1 ring-slate-200">
              <CalcIcon className="h-10 w-10" />
            </div>
            <p className="mt-1.5 text-center text-[11px] text-slate-500">{l}</p>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.75 }}
        className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200"
      >
        <CheckIcon className="h-5 w-5 text-emerald-600" />
        Verified · back to available
      </motion.div>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════
   BENTO — why it works, with a cursor spotlight
   ════════════════════════════════════════════════════════════════ */

function Bento() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24">
      <Reveal>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">Why it works</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-[-0.03em] text-slate-950 sm:text-5xl">
          Trust without deposits, meetings, or WhatsApp chaos.
        </h2>
      </Reveal>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        <Spot className="md:col-span-2" delay={0}>
          <CardText
            title="Only your college gets in"
            body="Sign-in works with @iiitdwd.ac.in Google accounts only. Every borrow is tied to a real roll number."
          />
          <div className="mt-6 space-y-2.5">
            <EmailRow ok email="24bcs098@iiitdwd.ac.in" />
            <EmailRow email="randomguy123@gmail.com" />
          </div>
        </Spot>

        <Spot delay={0.08}>
          <CardText title="No deposit" body="Your roll number is the deposit. Late or damaged? It's on record." />
          <p className="mt-6 font-display text-6xl font-bold tracking-tight text-slate-950">
            ₹0<span className="ml-2 text-base font-medium text-slate-400">upfront</span>
          </p>
        </Spot>

        <Spot delay={0.12}>
          <CardText title="Photo proof, both ways" body="One photo at handover, one on return. Damage is attributable, not arguable." />
          <div className="mt-6 flex gap-2">
            {["Before", "After"].map((l) => (
              <div key={l} className="flex-1">
                <div className="grid aspect-[4/3] place-items-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-400 md:aspect-square">
                  <CameraIcon className="h-7 w-7" />
                </div>
                <p className="mt-1 text-center text-[11px] text-slate-500">{l}</p>
              </div>
            ))}
          </div>
        </Spot>

        <Spot className="md:col-span-2" delay={0.16}>
          <CardText
            title="Two taps, one winner"
            body="Two people hit Reserve at the same instant? The database lets exactly one through. No double-booking, ever."
          />
          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
              <CheckIcon className="h-4 w-4" /> You · Reserved, code 4821
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
              Them · &ldquo;Someone just reserved this&rdquo;
            </div>
          </div>
          <ol className="mt-5 space-y-2 border-l-2 border-dashed border-slate-200 pl-4 font-mono text-xs text-slate-500">
            <li><span className="text-slate-400">18:04:31.207</span> · you tap Reserve</li>
            <li><span className="text-slate-400">18:04:31.209</span> · they tap Reserve</li>
            <li className="text-emerald-700"><span className="text-slate-400">18:04:31.240</span> · one write wins, the other is told nicely</li>
          </ol>
        </Spot>

        <Spot className="md:col-span-3" delay={0.2}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <CardText
              title="No app to install"
              body="Your phone camera already reads the QR tag. Add CampusShare to your home screen if you like."
            />
            <div className="flex shrink-0 items-center gap-3">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-950 text-white">
                <CameraIcon className="h-6 w-6" />
              </span>
              <span className="text-indigo-400">→</span>
              <span className="rounded-2xl bg-white p-1.5 ring-1 ring-slate-200">
                <MiniQR seed="CS-1004" className="h-11 w-11" />
              </span>
              <span className="text-indigo-400">→</span>
              <span className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white">Item page</span>
            </div>
          </div>
        </Spot>
      </div>
    </section>
  )
}

function CardText({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-display text-2xl font-semibold tracking-tight text-slate-950">{title}</h3>
      <p className="mt-2 max-w-md leading-relaxed text-slate-600">{body}</p>
    </div>
  )
}

function EmailRow({ email, ok }: { email: string; ok?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm ring-1",
        ok ? "bg-emerald-50 ring-emerald-200" : "bg-rose-50 ring-rose-200"
      )}
    >
      <span className="truncate font-mono text-slate-700">{email}</span>
      <span className={cn("shrink-0 text-xs font-semibold", ok ? "text-emerald-700" : "text-rose-700")}>
        {ok ? "Welcome in" : "Refused"}
      </span>
    </div>
  )
}

function Spot({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: EASE }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`)
        e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`)
      }}
      className={cn(
        "group relative overflow-hidden rounded-[1.75rem] bg-white p-7 ring-1 ring-slate-200 transition-shadow hover:shadow-xl hover:shadow-indigo-500/5",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100
                   [background:radial-gradient(420px_circle_at_var(--x,50%)_var(--y,50%),rgb(99_102_241/0.10),transparent_45%)]"
      />
      <div className="relative">{children}</div>
    </motion.div>
  )
}

/* ════════════════════════════════════════════════════════════════
   NUMBERS — dark band, values count up
   ════════════════════════════════════════════════════════════════ */

function Numbers({ total }: { total: number }) {
  const facts: { value: number; decimals?: number; prefix?: string; suffix?: string; label: string }[] = [
    { value: 121, prefix: "₹", label: "Total cost to build the whole system" },
    { value: 0.6, decimals: 2, prefix: "₹", label: "Per printed QR tag" },
    { value: 30, prefix: "₹", suffix: "+", label: "What one RFID tag would cost instead" },
    { value: total, label: "Items listed on campus so far" },
  ]
  return (
    <section id="numbers" className="relative isolate scroll-mt-20 overflow-hidden bg-slate-950 py-24 text-white">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_20%_0%,rgb(99_102_241/0.35),transparent),radial-gradient(40rem_30rem_at_90%_100%,rgb(217_70_239/0.22),transparent)]"
      />
      <div className="mx-auto w-full max-w-6xl px-4">
        <Reveal>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-300">Frugal by design</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
            Built for less than a single calculator.
          </h2>
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {facts.map((f) => (
            <div key={f.label} className="border-l border-white/15 pl-5">
              <p className="font-display text-5xl font-bold tracking-tight sm:text-6xl">
                <CountUp {...f} />
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
}: {
  value: number
  decimals?: number
  prefix?: string
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? value : 0)

  useEffect(() => {
    if (!inView || reduce) return
    const c = animate(0, value, { duration: 1.6, ease: EASE, onUpdate: setShown })
    return () => c.stop()
  }, [inView, reduce, value])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  )
}

/* ════════════════════════════════════════════════════════════════
   FINAL CTA
   ════════════════════════════════════════════════════════════════ */

function FinalCta() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-24">
      <Reveal>
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-16 text-center text-white sm:px-16 sm:py-20">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(to_right,rgb(255_255_255/0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgb(255_255_255/0.15)_1px,transparent_1px)] [background-size:36px_36px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          />
          <h2 className="mx-auto max-w-3xl font-display text-4xl font-bold tracking-[-0.03em] sm:text-6xl">
            Your cupboard is someone&apos;s exam-day rescue.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-indigo-100">
            List one thing you barely use. It takes a minute, and it might save a classmate ₹1,000.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link
              href="/items/new"
              className="inline-flex h-12 items-center rounded-2xl bg-white px-7 text-sm font-semibold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98]"
            >
              Lend something
            </Link>
            <Link
              href="/items"
              className="inline-flex h-12 items-center rounded-2xl bg-white/10 px-7 text-sm font-semibold text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/20"
            >
              Browse items
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

/* ════════════════════════════════════════════════════════════════
   small shared bits
   ════════════════════════════════════════════════════════════════ */

function Reveal({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="group relative inline-flex h-12 items-center gap-2 overflow-hidden rounded-2xl bg-slate-950 px-6 text-sm
                 font-semibold text-white shadow-lg shadow-indigo-900/20 transition hover:-translate-y-0.5
                 hover:shadow-xl hover:shadow-indigo-600/25 active:scale-[0.98]"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/25 to-transparent
                   opacity-0 group-hover:opacity-100 group-hover:animate-[shine_0.9s_ease-out]"
      />
      <span className="relative">{children}</span>
      <span className="relative transition-transform group-hover:translate-x-1">→</span>
    </Link>
  )
}

function LiveDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 animate-[ping-soft_1.6s_ease-out_infinite]" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  )
}

/**
 * A decorative QR-looking grid, generated from the item code so each
 * card looks different. Not scannable — real tags come from lib/qr.ts.
 */
function MiniQR({ seed, className }: { seed: string; className?: string }) {
  const n = 13
  let h = 2166136261
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  const rand = () => {
    h ^= h << 13
    h ^= h >>> 17
    h ^= h << 5
    return ((h >>> 0) % 1000) / 1000
  }
  const finder = (x: number, y: number) =>
    [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ].some(([fx, fy]) => x >= fx && x < fx + 7 && y >= fy && y < fy + 7)

  const cells: ReactNode[] = []
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) if (!finder(x, y) && rand() > 0.5) cells.push(<rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />)

  return (
    <svg viewBox={`0 0 ${n} ${n}`} className={cn("text-slate-900", className)} fill="currentColor" shapeRendering="crispEdges" aria-hidden>
      {cells}
      <QrFinder x={0} y={0} />
      <QrFinder x={n - 7} y={0} />
      <QrFinder x={0} y={n - 7} />
    </svg>
  )
}

function QrFinder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="7" height="7" rx="1.2" />
      <rect x={x + 1} y={y + 1} width="5" height="5" rx="0.8" fill="white" />
      <rect x={x + 2} y={y + 2} width="3" height="3" rx="0.6" />
    </g>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" className={className} aria-hidden>
      <path d="M4.5 10.5l3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CalcIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className} aria-hidden>
      <rect x="5" y="2.5" width="14" height="19" rx="2.5" />
      <rect x="8" y="5.5" width="8" height="4" rx="1" />
      <path d="M8.5 13h.01M12 13h.01M15.5 13h.01M8.5 16.5h.01M12 16.5h.01M15.5 16.5h.01" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden>
      <path d="M4 8.5A2.5 2.5 0 016.5 6h1.6l1.2-1.8a1.5 1.5 0 011.25-.7h2.9a1.5 1.5 0 011.25.7L15.9 6h1.6A2.5 2.5 0 0120 8.5v8a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-8z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  )
}
