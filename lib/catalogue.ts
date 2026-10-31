import type { Prisma } from "@prisma/client"
import type { CatalogueItem } from "@/components/CatalogueCard"
import { findStockImage } from "@/lib/stockImage"
import { photoSrc } from "@/lib/photo"

/** What a page must select from an item for it to become a Catalogue card. */
export const CATALOGUE_SELECT = {
  id: true,
  title: true,
  category: true,
  code: true,
  meetSpot: true,
  status: true,
  description: true,
  imageUrl: true,
  loans: {
    where: { status: { in: ["ISSUED", "COLLECTED"] } },
    select: { dueAt: true },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
} satisfies Prisma.ItemSelect

type Row = Prisma.ItemGetPayload<{ select: typeof CATALOGUE_SELECT }>

const DAY = 86_400_000

/** "THU" within the next week, otherwise "12 NOV". Indian time, worked out on the server. */
function backByLabel(due: Date) {
  const tz = "Asia/Kolkata"
  const soon = due.getTime() - Date.now() < 6 * DAY
  return (
    soon
      ? due.toLocaleDateString("en-IN", { weekday: "short", timeZone: tz })
      : due.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: tz })
  ).toUpperCase()
}

/** Turns database rows into Catalogue cards: photo URL, stock fallback, back-by label. */
export async function toCatalogue(rows: Row[]): Promise<CatalogueItem[]> {
  const stock = await Promise.all(rows.map((r) => (r.imageUrl ? null : findStockImage(r.title, r.category))))
  return rows.map((r, i) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    code: r.code,
    meetSpot: r.meetSpot,
    status: r.status,
    description: r.description,
    photo: photoSrc("item", r.id, r.imageUrl) ?? stock[i]?.url ?? null,
    stock: !r.imageUrl && stock[i] ? { author: stock[i]!.author, license: stock[i]!.license } : null,
    backBy: r.loans[0] ? backByLabel(r.loans[0].dueAt) : null,
  }))
}
