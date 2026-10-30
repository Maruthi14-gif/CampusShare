"use client"

import Link from "next/link"
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card"
import { StatusBadge } from "@/components/ui"

export type ItemCardData = {
  id: string
  title: string
  category: string
  code: string
  slot: string | null
  status: string
  imageUrl: string | null
  description: string | null
  ownerName: string | null
}

/**
 * Aceternity "3D Card", laid out like their demo: title floats at 50px,
 * the details line at 60px, the photo pops out furthest at 100px, and
 * the bottom row sits just above the card at 20px.
 */
export function ItemCard3D({ item, compact = false }: { item: ItemCardData; compact?: boolean }) {
  return (
    <Link href={`/items/${item.id}`} aria-label={item.title} className="block h-full">
      <CardContainer containerClassName="py-0 h-full" className="h-full w-full">
        <CardBody className="group/card relative h-full w-full rounded-xl border border-black/[0.1] bg-gray-50 p-5 hover:shadow-2xl hover:shadow-indigo-500/[0.12] sm:p-6">
          <CardItem translateZ="50" className="line-clamp-1 text-xl font-bold text-neutral-700">
            {item.title}
          </CardItem>

          <CardItem as="p" translateZ="60" className="mt-1.5 line-clamp-1 max-w-sm text-sm text-neutral-500">
            {item.category} · <span className="font-mono">{item.code}</span>
            {item.description && !compact ? ` · ${item.description}` : ""}
          </CardItem>

          <CardItem translateZ="100" className="relative mt-4 w-full">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className={`${compact ? "h-36" : "h-52"} w-full rounded-xl object-cover group-hover/card:shadow-xl`}
              />
            ) : (
              <NoPhoto code={item.code} category={item.category} compact={compact} />
            )}
            <span className="absolute left-3 top-3 rounded-full bg-white/90 shadow-sm backdrop-blur">
              <StatusBadge status={item.status} />
            </span>
          </CardItem>

          <div className={`flex items-center justify-between gap-3 ${compact ? "mt-5" : "mt-8"}`}>
            <CardItem translateZ={20} className="min-w-0 truncate px-1 text-xs font-normal text-neutral-500">
              {item.slot ? `Slot ${item.slot}` : "Slot not set"}
              {item.ownerName && !compact ? ` · ${item.ownerName}` : ""}
            </CardItem>
            <CardItem
              translateZ={20}
              className="shrink-0 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white transition-colors group-hover/card:bg-indigo-600"
            >
              {item.status === "AVAILABLE" && !compact ? "Borrow →" : "View →"}
            </CardItem>
          </div>
        </CardBody>
      </CardContainer>
    </Link>
  )
}

/** Shown when the lender skipped the photo: the tag code, on a soft gradient. */
function NoPhoto({ code, category, compact }: { code: string; category: string; compact: boolean }) {
  return (
    <div
      className={`${compact ? "h-36" : "h-52"} relative grid w-full place-items-center overflow-hidden rounded-xl
                  bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 group-hover/card:shadow-xl`}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-60 [background-image:linear-gradient(to_right,rgb(99_102_241/0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgb(99_102_241/0.10)_1px,transparent_1px)] [background-size:22px_22px]"
      />
      <div className="relative text-center">
        <p className="font-display text-3xl font-bold tracking-tight text-indigo-900/80">{code}</p>
        <p className="mt-1 text-xs text-indigo-900/50">{category} · no photo yet</p>
      </div>
    </div>
  )
}
