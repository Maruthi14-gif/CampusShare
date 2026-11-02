import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NewItemForm } from "@/components/NewItemForm"

export const dynamic = "force-dynamic"

export default async function NewItemPage({ searchParams }: { searchParams: Promise<{ request?: string }> }) {
  // Belt and braces with proxy.ts: never show the form to a signed-out
  // visitor, who would fill it in only to be told to sign in on submit.
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")
  const { request: requestId } = await searchParams

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hostel: true, room: true },
  })
  const back = requestId ? `/items/new?request=${requestId}` : "/items/new"
  if (!me?.hostel) redirect(`/profile?next=${encodeURIComponent(back)}`)

  const request = requestId
    ? await prisma.request.findFirst({
        where: { id: requestId, status: "OPEN", neededBy: { gte: new Date() }, userId: { not: session.user.id } },
        select: { id: true, title: true, category: true, user: { select: { name: true } } },
      })
    : null

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Lend an item</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Takes about a minute. Classmates can find and reserve it straight away.
      </p>
      <div className="mt-8">
        <NewItemForm
          hasRoom={!!me.room}
          hostel={me.hostel}
          forRequest={
            request
              ? { id: request.id, title: request.title, category: request.category, who: request.user.name?.split(" ")[0] ?? "them" }
              : null
          }
        />
      </div>
    </div>
  )
}
