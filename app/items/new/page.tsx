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

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <section aria-labelledby="protect-h" className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 id="protect-h" className="text-sm font-semibold text-ink">
            How you&apos;re protected
          </h2>
          <ul className="mt-2 grid gap-1.5 text-sm text-slate-600">
            <li>Only @iiitdwd.ac.in students can borrow, by roll number.</li>
            <li>Nobody gets it without typing your borrower&apos;s code, with a photo.</li>
            <li>Late, damaged or lost costs the borrower points and can pause their borrowing.</li>
          </ul>
        </section>
        <section aria-labelledby="earn-h" className="rounded-2xl bg-indigo-50 p-5 ring-1 ring-indigo-100">
          <h2 id="earn-h" className="text-sm font-semibold text-indigo-950">
            What you earn
          </h2>
          <p className="mt-2 text-sm text-indigo-950/80">
            <strong className="font-mono text-base text-indigo-700">+10</strong> points when it comes back fine, plus{" "}
            <strong className="font-mono text-indigo-700">+2</strong> for every day it was out. At 50 points you can
            borrow 3 items and jump waitlists.
          </p>
        </section>
      </div>
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
