import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatDate, daysLeft } from "@/lib/utils"
import { borrowerStanding, runHousekeeping } from "@/lib/rules"
import { CATALOGUE_SELECT, toCatalogue } from "@/lib/catalogue"
import { Badge, Card, Empty, StatusBadge } from "@/components/ui"
import { CatalogueCard } from "@/components/CatalogueCard"

export const dynamic = "force-dynamic"

const OPEN = ["RESERVED", "ISSUED", "COLLECTED", "RETURNED"] as const

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  const me = session.user.id
  await runHousekeeping()

  const [profile, standing, myItems, myBorrows, onMyItems, heldForMe, myRequests] = await Promise.all([
    prisma.user.findUnique({ where: { id: me }, select: { hostel: true } }),
    borrowerStanding(me),
    prisma.item.findMany({ where: { ownerId: me }, select: CATALOGUE_SELECT, orderBy: { createdAt: "desc" } }),
    prisma.loan.findMany({
      where: { borrowerId: me, status: { in: [...OPEN] } },
      include: { item: { select: { id: true, title: true, code: true } } },
      orderBy: { dueAt: "asc" },
    }),
    // Open loans on MY items
    prisma.loan.findMany({
      where: { item: { ownerId: me }, status: { in: [...OPEN] } },
      include: { item: { select: { id: true, title: true } }, borrower: { select: { name: true, rollNo: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.item.findMany({
      where: { holdUserId: me, holdUntil: { gt: new Date() }, status: "AVAILABLE" },
      select: { id: true, title: true, holdUntil: true },
    }),
    prisma.request.findMany({
      where: { userId: me, status: "OPEN", neededBy: { gte: new Date() } },
      orderBy: { neededBy: "asc" },
    }),
  ])

  const myCards = await toCatalogue(myItems)

  // Everything that needs a tap from me, as one list.
  const todo: { href: string; title: string; text: string; status: string }[] = []
  for (const l of onMyItems) {
    const who = l.borrower.name?.split(" ")[0] ?? l.borrower.rollNo ?? "A student"
    if (l.status === "RESERVED")
      todo.push({ href: `/items/${l.item.id}`, title: l.item.title, text: `${who} reserved it — meet at ${l.meetPlace} and hand it over`, status: l.status })
    if (l.status === "RETURNED")
      todo.push({ href: `/items/${l.item.id}`, title: l.item.title, text: `${who} returned it — check the photos and close the loan`, status: l.status })
    if (l.extendDays)
      todo.push({ href: `/items/${l.item.id}`, title: l.item.title, text: `${who} asked for ${l.extendDays} more day${l.extendDays === 1 ? "" : "s"}`, status: l.status })
  }
  for (const l of myBorrows) {
    if (l.returnRequestedAt)
      todo.push({ href: `/items/${l.item.id}`, title: l.item.title, text: "The owner needs it back early", status: l.status })
  }

  const firstName = session.user.name?.split(" ")[0]

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Hello{firstName ? `, ${firstName}` : ""}</h1>
          <p className="mt-1.5 text-sm text-slate-600">{session.user.email}</p>
        </div>
        <Link href="/profile" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Edit profile
        </Link>
      </div>

      {!profile?.hostel && (
        <Banner tone="amber">
          Add your hostel to start borrowing and lending.{" "}
          <Link href="/profile?next=/dashboard" className="font-semibold underline underline-offset-2">
            Finish your profile
          </Link>
        </Banner>
      )}
      {standing.reason && <Banner tone={standing.blockedUntil ? "red" : "amber"}>{standing.reason}</Banner>}

      {heldForMe.length > 0 && (
        <Section title="Held for you">
          {heldForMe.map((i) => (
            <Row key={i.id} href={`/items/${i.id}`} title={i.title} text={`Your turn from the waitlist — reserve before ${formatDate(i.holdUntil!)}`}>
              <Badge tone="green">held</Badge>
            </Row>
          ))}
        </Section>
      )}

      {todo.length > 0 && (
        <Section title="Waiting for you">
          {todo.map((t, i) => (
            <Row key={i} href={t.href} title={t.title} text={t.text}>
              <StatusBadge status={t.status} />
            </Row>
          ))}
        </Section>
      )}

      <Section title="You're borrowing">
        {myBorrows.length === 0 ? (
          <Empty
            title="Nothing borrowed right now"
            body="Browse what other students have put up, or post a request."
            action={
              <div className="flex gap-2">
                <Link href="/items" className="inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-indigo-700">
                  Browse items
                </Link>
                <Link href="/requests" className="inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-medium text-slate-700 ring-1 ring-slate-200">
                  Post a request
                </Link>
              </div>
            }
          />
        ) : (
          myBorrows.map((loan) => {
            const left = daysLeft(loan.dueAt)
            const out = loan.status === "ISSUED" || loan.status === "COLLECTED"
            const overdue = out && left < 0
            return (
              <Row
                key={loan.id}
                href={`/items/${loan.item.id}`}
                title={loan.item.title}
                text={`${loan.item.code} · ${loan.status === "RESERVED" ? `pick up at ${loan.meetPlace}` : `due ${formatDate(loan.dueAt)}`}`}
              >
                {overdue ? (
                  <Badge tone="red">
                    {Math.abs(left)} day{Math.abs(left) === 1 ? "" : "s"} overdue
                  </Badge>
                ) : out ? (
                  <Badge tone={left <= 1 ? "amber" : "grey"}>
                    {left} day{left === 1 ? "" : "s"} left
                  </Badge>
                ) : null}
                <StatusBadge status={loan.status} />
              </Row>
            )
          })
        )}
      </Section>

      {myRequests.length > 0 && (
        <Section title="Your requests" action={<Link href="/requests" className="text-sm font-medium text-indigo-600">See all</Link>}>
          {myRequests.map((r) => (
            <Row key={r.id} href="/requests" title={r.title} text={`Needed by ${formatDate(r.neededBy)} · waiting for a lender`}>
              <Badge tone="amber">open</Badge>
            </Row>
          ))}
        </Section>
      )}

      <Section
        title="You're lending"
        action={
          <Link href="/items/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            + Add another
          </Link>
        }
      >
        {myItems.length === 0 ? (
          <Empty
            title="You haven't listed anything"
            body="Think of something you bought and used twice."
            action={
              <Link href="/items/new" className="inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-indigo-700">
                Lend an item
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {myCards.map((item) => (
              <CatalogueCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </Section>
    </div>
  )
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  )
}

function Row({ href, title, text, children }: { href: string; title: string; text: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="block">
      <Card className="flex flex-wrap items-center gap-3 p-4 transition hover:shadow-md">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{title}</p>
          <p className="text-xs text-slate-500">{text}</p>
        </div>
        {children}
      </Card>
    </Link>
  )
}

function Banner({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  return (
    <p
      className={`mt-6 rounded-xl px-4 py-3 text-sm ring-1 ${
        tone === "red" ? "bg-red-50 text-red-800 ring-red-200" : "bg-amber-50 text-amber-900 ring-amber-200"
      }`}
    >
      {children}
    </p>
  )
}
