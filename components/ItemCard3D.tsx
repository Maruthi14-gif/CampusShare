"use client"

import Link from "next/link"
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card"
import { StatusBadge } from "@/components/ui"

export type ItemCardData = {
  id: string
  title: string
  category: string
  code: string
  meetSpot: string
  status: string
  imageUrl: string | null
  description: string | null
  /** Stand-in from Wikimedia Commons when the lender added no photo. */
  stock: { url: string; author: string; license: string } | null
}

/**
 * Aceternity "3D Card" demo 2, with CampusShare content.
 * Styling and motion values are the demo's own: title at 50px, text at
 * 60px, photo at 100px tilted (rotateX 20, rotateZ -10), and the two
 * actions pushed apart sideways (translateX -40 / 40).
 */
export function ItemCard3D({ item }: { item: ItemCardData }) {
  const photo = item.imageUrl ?? item.stock?.url ?? null
  const action = item.status === "AVAILABLE" ? "Borrow" : "View"

  return (
    <Link href={`/items/${item.id}`} aria-label={item.title} className="block w-full sm:w-auto">
      <CardContainer className="inter-var w-full sm:w-auto" containerClassName="py-6">
        <CardBody className="bg-gray-50 relative group/card  dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-full sm:w-[30rem] h-auto rounded-xl p-6 border  ">
          <CardItem translateZ="50" className="text-xl font-bold text-neutral-600 dark:text-white">
            {item.title}
          </CardItem>
          <CardItem
            as="p"
            translateZ="60"
            className="text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
          >
            {item.description ?? (item.status === "AVAILABLE" ? "Ready to borrow" : "Not available right now")}
            <span className="mt-1 block text-xs text-neutral-400">
              {item.category} · <span className="font-mono">{item.code}</span>
              {` · ${item.meetSpot}`}
            </span>
          </CardItem>
          <CardItem translateZ="100" rotateX={20} rotateZ={-10} className="w-full mt-4">
            <div className="relative">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo}
                  height="1000"
                  width="1000"
                  className="h-60 w-full object-cover rounded-xl group-hover/card:shadow-xl"
                  alt={item.title}
                />
              ) : (
                <NoPhoto code={item.code} category={item.category} />
              )}
              <span className="absolute left-3 top-3 rounded-full bg-white/90 shadow-sm backdrop-blur">
                <StatusBadge status={item.status} />
              </span>
              {!item.imageUrl && item.stock && (
                <span
                  title={`Not the actual item. Photo: ${item.stock.author}, ${item.stock.license}, via Wikimedia Commons`}
                  className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-medium text-white backdrop-blur"
                >
                  Stock photo · {item.stock.license}
                </span>
              )}
            </div>
          </CardItem>
          <div className="flex justify-between items-center mt-20">
            <CardItem
              translateZ={20}
              translateX={-40}
              as="span"
              className="px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
            >
              Details →
            </CardItem>
            <CardItem
              translateZ={20}
              translateX={40}
              as="span"
              className="px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black text-white text-xs font-bold"
            >
              {action}
            </CardItem>
          </div>
        </CardBody>
      </CardContainer>
    </Link>
  )
}

/** Last resort when even the stock-photo lookup fails: the tag code on a soft grid. */
function NoPhoto({ code, category }: { code: string; category: string }) {
  return (
    <div className="relative grid h-60 w-full place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-100 via-violet-50 to-fuchsia-100 group-hover/card:shadow-xl">
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
