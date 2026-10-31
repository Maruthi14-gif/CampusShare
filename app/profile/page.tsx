import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { trustStats } from "@/lib/rules"
import { ProfileForm } from "@/components/ProfileForm"

export const dynamic = "force-dynamic"

/** Only allow returning to a path on this site. */
function safeNext(raw?: string) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin?callbackUrl=%2Fprofile")
  const { next } = await searchParams

  const [user, stats] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, rollNo: true, hostel: true, room: true, phone: true },
    }),
    trustStats(session.user.id),
  ])
  if (!user) redirect("/signin")

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Your profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        {user.name} · {user.email}
        {user.rollNo && ` · ${user.rollNo}`}
      </p>
      <p className="mt-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
        Borrowed {stats.borrowed} · late {stats.late} · lent {stats.lent}
      </p>

      {!user.hostel && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Add your hostel to start borrowing and lending. It decides where handovers happen.
        </p>
      )}

      <div className="mt-8">
        <ProfileForm initial={{ hostel: user.hostel, room: user.room, phone: user.phone }} next={safeNext(next)} />
      </div>
    </div>
  )
}
