import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CATEGORIES } from "@/lib/utils"
import { Empty, Input } from "@/components/ui"
import { ItemCard3D } from "@/components/ItemCard3D"

export const dynamic = "force-dynamic"

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; all?: string }>
}) {
  const { q, category, all } = await searchParams

  const items = await prisma.item.findMany({
    where: {
      ...(all ? {} : { status: "AVAILABLE" }),
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { code: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { owner: { select: { name: true, rollNo: true } } },
    orderBy: { createdAt: "desc" },
    take: 60,
  })

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Browse</h1>
          <p className="mt-1.5 text-sm text-slate-600">
            {all ? "Everything on CampusShare" : "Free to borrow right now"}
          </p>
        </div>
        <Link
          href={all ? "/items" : "/items?all=1"}
          className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          {all ? "Show only available" : "Show everything"}
        </Link>
      </div>

      {/* Plain GET form — no JavaScript needed, so search works even on a bad connection */}
      <form className="mt-6 flex flex-wrap gap-2" action="/items">
        {all && <input type="hidden" name="all" value="1" />}
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search by name or item code…"
          className="max-w-xs"
        />
        <select
          name="category"
          defaultValue={category ?? ""}
          className="rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm ring-1 ring-inset ring-slate-300"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Search
        </button>
      </form>

      <div className="mt-8">
        {items.length === 0 ? (
          <Empty
            title="Nothing here yet"
            body={
              q || category
                ? "No items match that search. Try a different category."
                : "Be the first — list something you barely use."
            }
            action={
              <Link
                href="/items/new"
                className="inline-flex h-11 items-center rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white"
              >
                Lend an item
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard3D
                key={item.id}
                item={{
                  id: item.id,
                  title: item.title,
                  category: item.category,
                  code: item.code,
                  slot: item.slot,
                  status: item.status,
                  imageUrl: item.imageUrl,
                  description: item.description,
                  ownerName: item.owner.name ?? "A student",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
