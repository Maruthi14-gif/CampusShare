import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { CATEGORIES } from "@/lib/utils"
import { Badge, Card, Empty, Input, StatusBadge } from "@/components/ui"

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <Link key={item.id} href={`/items/${item.id}`} className="group">
                <Card className="h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <div className="aspect-[4/3] w-full bg-slate-100">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="grid h-full place-items-center text-sm text-slate-400">
                        no photo
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-medium leading-snug text-slate-900">
                        {item.title}
                      </h2>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone="blue">{item.category}</Badge>
                      <Badge>{item.code}</Badge>
                      {item.slot && <Badge tone="amber">Slot {item.slot}</Badge>}
                    </div>
                    <p className="text-xs text-slate-500">
                      {item.owner.name ?? item.owner.rollNo ?? "A student"}
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
