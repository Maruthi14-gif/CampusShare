"use client"

import Image from "next/image"
import Link from "next/link"
import type { PointerEvent } from "react"

export type CatalogueItem = {
  id: string
  title: string
  category: string
  code: string
  meetSpot: string
  status: string
  description: string | null
  /** The lender's photo or a stock photo URL; null shows the tag-code art. */
  photo: string | null
  /** Set when the photo is a stand-in from Wikimedia Commons. */
  stock: { author: string; license: string } | null
  /** Short "back by" label for items out on loan, e.g. "THU" or "12 NOV". */
  backBy: string | null
}

/** The ink stamp on each card says, at a glance, whether you can borrow it. */
function stampFor(i: CatalogueItem): { text: string; tone: "free" | "taken" | "muted" } {
  switch (i.status) {
    case "AVAILABLE":
      return { text: "FREE", tone: "free" }
    case "RESERVED":
      return { text: "RESERVED", tone: "taken" }
    case "ISSUED":
    case "COLLECTED":
      return { text: i.backBy ? `OUT · ${i.backBy}` : "OUT", tone: "taken" }
    case "AWAITING_CHECK":
      return { text: "CHECKING", tone: "muted" }
    case "PAUSED":
      return { text: "PAUSED", tone: "muted" }
    default:
      return { text: i.status.replace("_", " "), tone: "muted" }
  }
}

const STAMP_TONE = {
  free: "text-emerald-700",
  taken: "text-stamp",
  muted: "text-slate-600",
}

/** A small, mouse-only tilt: the card leans toward the cursor, the photo lifts. */
function tilt(e: PointerEvent<HTMLAnchorElement>) {
  if (e.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width - 0.5
  const y = (e.clientY - r.top) / r.height - 0.5
  el.style.transform = `rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`
  el.querySelector<HTMLElement>("[data-photo]")?.style.setProperty("transform", "translateZ(24px)")
}
function untilt(e: PointerEvent<HTMLAnchorElement>) {
  const el = e.currentTarget
  el.style.transform = ""
  el.querySelector<HTMLElement>("[data-photo]")?.style.removeProperty("transform")
}

/**
 * The Catalogue card: a library index card. Photo with an ink stamp,
 * the item's name, then dashed rows for where to meet and the tag code.
 */
export function CatalogueCard({
  item,
  priority = false,
  titleAs: Title = "h3",
}: {
  item: CatalogueItem
  priority?: boolean
  /** Heading level for the item name, so it fits the page outline (h2 on Browse). */
  titleAs?: "h2" | "h3"
}) {
  const stamp = stampFor(item)
  const unavailable = item.status !== "AVAILABLE"

  return (
    <div className="[perspective:1000px]">
      <Link
        href={`/items/${item.id}`}
        onPointerMove={tilt}
        onPointerLeave={untilt}
        className="block rounded-[14px] border border-slate-200 bg-white p-3 transition-[transform,box-shadow] duration-200 ease-out [transform-style:preserve-3d] hover:shadow-[0_24px_46px_-24px_rgb(18_20_43/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        <div data-photo className="relative aspect-[4/3] overflow-hidden rounded-[9px] bg-paper transition-transform duration-200 ease-out">
          {item.photo ? (
            <Image
              src={item.photo}
              alt={item.title}
              fill
              priority={priority}
              sizes="(min-width: 1024px) 340px, (min-width: 640px) 45vw, 92vw"
              className={`object-cover ${unavailable ? "opacity-80 grayscale-[0.85]" : ""}`}
            />
          ) : (
            <div className="grid h-full place-items-center bg-indigo-50 font-mono text-2xl font-bold text-indigo-700">
              {item.code}
            </div>
          )}
          <span
            className={`absolute right-2.5 top-2.5 -rotate-[7deg] rounded-md border-2 border-current bg-white/85 px-2 py-0.5 font-mono text-[11px] font-bold tracking-[0.12em] ${STAMP_TONE[stamp.tone]}`}
          >
            {stamp.text}
          </span>
          {item.stock && (
            <span
              title={`Not the actual item. Photo: ${item.stock.author}, ${item.stock.license}, via Wikimedia Commons`}
              className="absolute bottom-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white"
            >
              Stock photo
            </span>
          )}
        </div>

        <div className="grid gap-2 px-1 pb-0.5 pt-3">
          <Title className="font-display text-lg font-bold leading-tight tracking-[-0.02em] text-ink">{item.title}</Title>
          <dl className="divide-y divide-dashed divide-slate-200 border-y border-dashed border-slate-200 text-[13px]">
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-slate-500">Meet at</dt>
              <dd className="min-w-0 truncate text-right font-mono text-[12.5px] text-ink">{item.meetSpot}</dd>
            </div>
            <div className="flex justify-between gap-3 py-1.5">
              <dt className="text-slate-500">Tag</dt>
              <dd className="font-mono text-[12.5px] text-ink">{item.code}</dd>
            </div>
          </dl>
        </div>
      </Link>
    </div>
  )
}
