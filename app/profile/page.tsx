import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { karmaFor } from "@/lib/karma"
import { ProfileForm } from "@/components/ProfileForm"
import { KarmaCard, ThanksList } from "@/components/Karma"

export const dynamic = "force-dynamic"

/** Only allow returning to a path on this site. */
function safeNext(raw?: string) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : null
}

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/signin?callbackUrl=%2Fprofile")
  const { next } = await searchParams

  const [user, karma] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, rollNo: true, hostel: true, room: true, phone: true },
    }),
    karmaFor(session.user.id),
  ])
  if (!user) redirect("/signin")

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12">
      <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink">Your profile</h1>
      <p className="mt-2 text-sm text-slate-600">
        {user.name} · {user.email}
        {user.rollNo && ` · ${user.rollNo}`}
      </p>

      {!user.hostel && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Add your hostel to start borrowing and lending. It decides where handovers happen.{" "}
          <a href="#hostel" className="font-semibold underline underline-offset-2">
            Set it now
          </a>
        </p>
      )}

      <div className="mt-8">
        <KarmaCard karma={karma} />
      </div>

      <section aria-labelledby="thanks-h" className="mt-8">
        <h2 id="thanks-h" className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">
          Thank-you notes
        </h2>
        <div className="mt-3">
          <ThanksList thanks={karma.thanks} emptyHint="When someone returns your item, they can leave you a note. It shows up here." />
        </div>
      </section>

      <h2 id="hostel" className="mt-10 scroll-mt-24 font-display text-2xl font-bold tracking-[-0.02em] text-ink">
        Hostel and contact
      </h2>
      <div className="mt-3">
        <ProfileForm initial={{ hostel: user.hostel, room: user.room, phone: user.phone }} next={safeNext(next)} />
      </div>
    </div>
  )
}
