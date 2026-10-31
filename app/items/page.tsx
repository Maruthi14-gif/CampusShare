import { prisma } from "@/lib/prisma"
import { CATEGORIES } from "@/lib/utils"
import { runHousekeeping } from "@/lib/rules"
import { CATALOGUE_SELECT, toCatalogue } from "@/lib/catalogue"
import { BrowseClient } from "@/components/BrowseClient"

export const dynamic = "force-dynamic"

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; all?: string }>
}) {
  const { q, category, all } = await searchParams
  await runHousekeeping()

  // Everything except lost items; the page filters instantly in the browser.
  const rows = await prisma.item.findMany({
    where: { status: { not: "LOST" } },
    select: CATALOGUE_SELECT,
    orderBy: { createdAt: "desc" },
    take: 300,
  })

  return (
    <BrowseClient
      items={await toCatalogue(rows)}
      categories={CATEGORIES}
      initial={{ q: q ?? "", category: category ?? "All", all: !!all }}
    />
  )
}
