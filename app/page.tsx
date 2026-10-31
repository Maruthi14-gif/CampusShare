import { prisma } from "@/lib/prisma"
import { Landing, type FeaturedItem } from "@/components/Landing"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  // Live numbers make the landing page feel real. If the database is
  // asleep or down, the page still renders with sensible fallbacks.
  let available = 0
  let total = 0
  let featured: FeaturedItem[] = []
  try {
    ;[available, total, featured] = await Promise.all([
      prisma.item.count({ where: { status: "AVAILABLE" } }),
      prisma.item.count(),
      prisma.item.findMany({
        where: { status: "AVAILABLE" },
        select: { id: true, title: true, category: true, code: true, meetSpot: true },
        orderBy: { createdAt: "desc" },
        take: 2,
      }),
    ])
  } catch (e) {
    console.error("landing stats unavailable", e)
  }

  return <Landing available={available} total={total} featured={featured} />
}
