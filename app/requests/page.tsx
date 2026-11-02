import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { formatDate, nowMs } from "@/lib/utils"
import { runHousekeeping } from "@/lib/rules"
import { appUrl } from "@/lib/notify"
import { Badge, Card, Empty } from "@/components/ui"
import { RequestActions, RequestForm } from "@/components/RequestsUI"
import { LevelBadge } from "@/components/Karma"
import { karmaFor } from "@/lib/karma"

export const dynamic = "force-dynamic"

export default async function RequestsPage({ searchParams }: { searchParams: Promise<{ title?: string }> }) {
  const { title } = await searchParams
  await runHousekeeping()
  const session = await auth()
  const me = session?.user?.id ?? null

  const [requests, myItems] = await Promise.all([
    prisma.request.findMany({
      where: { status: "OPEN", neededBy: { gte: new Date() } },
      include: { user: { select: { name: true } } },
      orderBy: { neededBy: "asc" }, // most urgent first
      take: 100,
    }),
    me
      ? prisma.item.findMany({
          where: { ownerId: me, status: "AVAILABLE" },
          select: { id: true, title: true },
          orderBy: { createdAt: "desc" },
        })
      : [],
  ])

  // Requester levels, so lenders can see who is reliable (one lookup per student).
  const requesterIds = [...new Set(requests.map((r) => r.userId))]
  const levels = new Map(await Promise.all(requesterIds.map(async (id) => [id, (await karmaFor(id)).level] as const)))

  // Today in India, for the date picker's minimum.
  const now = nowMs()
  const today = new Date(now + 5.5 * 3_600_000).toISOString().slice(0, 10)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Requests</h1>
      <p className="mt-1.5 text-sm text-slate-600">Students asking to borrow something. Most urgent first.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          {requests.length === 0 ? (
            <Empty title="No open requests" body="When someone needs something, it shows up here." />
          ) : (
            requests.map((r) => {
              const who = r.user.name?.split(" ")[0] ?? "A student"
              const mine = r.userId === me
              const hoursLeft = (r.neededBy.getTime() - now) / 3_600_000
              return (
                <Card key={r.id} className="space-y-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {r.title}
                        {levels.get(r.userId) && levels.get(r.userId) !== "Newcomer" && (
                          <LevelBadge level={levels.get(r.userId)!} className="ml-2 align-middle" />
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {mine ? "Your request" : who} · {r.category} · needed by {formatDate(r.neededBy)}
                      </p>
                    </div>
                    {hoursLeft < 48 ? <Badge tone="red">urgent</Badge> : <Badge tone="amber">open</Badge>}
                  </div>
                  {r.note && <p className="text-sm text-slate-600">{r.note}</p>}
                  <RequestActions
                    requestId={r.id}
                    mine={mine}
                    signedIn={!!me}
                    myItems={myItems}
                    shareText={`${who} needs a ${r.title} by ${formatDate(r.neededBy)}. Can you lend one? ${appUrl("/requests")}`}
                  />
                </Card>
              )
            })
          )}
        </div>

        <div>
          {me ? (
            <RequestForm today={today} defaultTitle={(title ?? "").slice(0, 80)} />
          ) : (
            <Card className="p-6 text-sm text-slate-600">Sign in with your institute account to post a request.</Card>
          )}
        </div>
      </div>
    </div>
  )
}
