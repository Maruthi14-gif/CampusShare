"use client"

import { motion } from "motion/react"
import Link from "next/link"

const steps = [
  { n: "01", t: "Tag it", d: "Stick a printed QR code on the item and list it in under a minute." },
  { n: "02", t: "Book it", d: "See what's free right now, reserve it, get a pickup code." },
  { n: "03", t: "Swap it", d: "Leave it in a numbered slot. Scan on handover and on return." },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft background wash — pure CSS, costs nothing to load */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10
                   bg-[radial-gradient(60rem_40rem_at_50%_-10rem,#e0e7ff,transparent)]"
      />
      <div className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 sm:pt-28">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs
                     font-medium text-indigo-700 ring-1 ring-indigo-200"
        >
          IIIT Dharwad · built for ₹121
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-6xl"
        >
          Borrow what you need.
          <br />
          <span className="text-indigo-600">Lend what you don&apos;t.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600"
        >
          A scientific calculator for one exam. A lab coat for one lab block. A drafter
          you&apos;ll use three times. CampusShare puts them in circulation instead of in a
          cupboard.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-9 flex flex-wrap gap-3"
        >
          <Link
            href="/items"
            className="inline-flex h-12 items-center rounded-xl bg-indigo-600 px-6 text-sm
                       font-medium text-white shadow-sm shadow-indigo-600/25 transition
                       hover:bg-indigo-700 active:scale-[0.98]"
          >
            Browse what&apos;s available
          </Link>
          <Link
            href="/items/new"
            className="inline-flex h-12 items-center rounded-xl bg-white px-6 text-sm
                       font-medium text-slate-800 ring-1 ring-slate-200 transition
                       hover:bg-slate-50 active:scale-[0.98]"
          >
            Lend something
          </Link>
        </motion.div>
      </div>
    </section>
  )
}

export function Steps() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-20">
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="rounded-2xl bg-white p-6 ring-1 ring-slate-200/80"
          >
            <span className="text-xs font-semibold tracking-widest text-indigo-500">
              {s.n}
            </span>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{s.t}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{s.d}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

export function FrugalStrip() {
  const facts = [
    ["₹121", "total bill of materials"],
    ["₹0.60", "per printed QR tag"],
    ["₹30+", "what an RFID tag would cost"],
    ["₹0", "software, on free tiers"],
  ]
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-4 py-12 sm:grid-cols-4">
        {facts.map(([big, small], i) => (
          <motion.div
            key={big}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.07 }}
          >
            <p className="text-3xl font-semibold tracking-tight text-slate-900">{big}</p>
            <p className="mt-1 text-sm text-slate-500">{small}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
