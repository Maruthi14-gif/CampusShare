import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatDate, daysLeft } from "@/lib/utils"
import { Badge, Card, Empty, StatusBadge } from "@/components/ui"

export const dynamic = "force-dynamic"

const OPEN = ["RESERVED", "ISSUED", "COLLECTED", "RETURNED"] as const

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  const me = session.user.id

  const [myItems, myBorrows, needsMe] = await Promise.all([
    prisma.item.findMany({
      where: { ownerId: me },
      orderBy: { createdAt: "desc" },
    }),
    prisma.loan.findMany({
      where: { borrowerId: me, status: { in: [...OPEN] } },
      include: { item: { select: { id: true, title: true, code: true, slot: true } } },
      orderBy: { dueAt: "asc" },
    }),
    // Loans on MY items that are waiting for an action from me
    prisma.loan.findMany({
      where: { item: { ownerId: me }, status: { in: ["RESERVED", "RETURNED"] } },
      include: {
        item: { select: { id: true, title: true, code: true } },
        borrower: { select: { name: true, rollNo: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ])

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">
        Hello{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1.5 text-sm text-slate-600">{session.user.email}</p>

      {/* ── things waiting on you ── */}
      {needsMe.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Waiting for you</h2>
          <div className="mt-4 space-y-3">
            {needsMe.map((loan) => (
              <Link key={loan.id} href={`/items/${loan.item.id}`}>
                <Card className="flex flex-wrap items-center gap-3 p-4 transition hover:shadow-md">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{loan.item.title}</p>
                    <p className="text-xs text-slate-500">
                      {loan.status === "RESERVED"
                        ? `${loan.borrower.name ?? loan.borrower.rollNo} reserved it — hand it over and mark issued`
                        : `${loan.borrower.name ?? loan.borrower.rollNo} returned it — check the condition photos`}
                    </p>
                  </div>
                  <StatusBadge status={loan.status} />
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── borrowing ── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">You&apos;re borrowing</h2>
        <div className="mt-4">
          {myBorrows.length === 0 ? (
            <Empty
              title="Nothing borrowed right now"
              body="Browse what other students have put up."
              action={
                <Link
                  href="/items"
                  className="inline-flex h-11 items-center rounded-xl bg-indigo-600 px-5 text-sm font-medium text-white"
                >
                  Browse items
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {myBorrows.map((loan) => {
                const left = daysLeft(loan.dueAt)
                const overdue = left < 0 && loan.status !== "RETURNED"
                return (
                  <Link key={loan.id} href={`/items/${loan.item.id}`}>
                    <Card className="flex flex-wrap items-center gap-3 p-4 transition hover:shadow-md">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{loan.item.title}</p>
                        <p className="text-xs text-slate-500">
                          {loan.item.code}
                          {loan.item.slot && ` · slot ${loan.item.slot}`} · due{" "}
                          {formatDate(loan.dueAt)}
                        </p>
                      </div>
                      {overdue ? (
                        <Badge tone="red">
                          {Math.abs(left)} day{Math.abs(left) === 1 ? "" : "s"} overdue
                        </Badge>
                      ) : (
                        <Badge tone={left <= 1 ? "amber" : "grey"}>
                          {left} day{left === 1 ? "" : "s"} left
                        </Badge>
                      )}
                      <StatusBadge status={loan.status} />
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── lending ── */}
      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold tracking-tight">You&apos;re lending</h2>
          <Link
            href="/items/new"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            + Add another
          </Link>
        </div>
        <div className="mt-4">
          {myItems.length === 0 ? (
            <Empty
              title="You haven't listed anything"
              body="Think of something you bought and used twice."
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
            <div className="grid gap-3 sm:grid-cols-2">
              {myItems.map((item) => (
                <Link key={item.id} href={`/items/${item.id}`}>
                  <Card className="flex items-center gap-3 p-4 transition hover:shadow-md">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {item.code}
                        {item.slot && ` · slot ${item.slot}`}
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
