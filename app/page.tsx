import { prisma } from "@/lib/prisma"
import { photoSrc } from "@/lib/photo"
import { HOSTELS, MEET_SPOTS } from "@/lib/campus"
import { Hero } from "@/components/landing/Hero"
import { MacBookScroll, type ScreenItem } from "@/components/landing/MacBookScroll"
import { Handover } from "@/components/landing/Handover"

export const dynamic = "force-dynamic"

/**
 * The landing page has exactly three parts: the hero, the MacBook scroll
 * showing real items, and the four handover steps. Then the footer.
 */
export default async function HomePage() {
  // Live data makes it feel real. If the database is asleep or down, the
  // page still renders with sensible fallbacks.
  let available = 0
  let items: ScreenItem[] = []
  try {
    const [count, rows] = await Promise.all([
      prisma.item.count({ where: { status: "AVAILABLE" } }),
      prisma.item.findMany({
        where: { status: "AVAILABLE" },
        select: { id: true, title: true, category: true, code: true, meetSpot: true, imageUrl: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ])
    available = count
    items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      code: r.code,
      meetSpot: r.meetSpot,
      photo: photoSrc("item", r.id, r.imageUrl),
    }))
  } catch (e) {
    console.error("landing data unavailable", e)
  }

  return (
    <>
      <Hero available={available} hostels={HOSTELS.join(" or ")} />
      {items.length > 0 && <MacBookScroll items={items} />}
      <Handover meetAt={MEET_SPOTS[0]} />
    </>
  )
}
