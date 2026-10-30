import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SignInButton } from "@/components/AuthButtons"
import { Card } from "@/components/ui"

/**
 * Where to go after signing in. Only paths on this site are allowed, so a
 * crafted link can't bounce a student off to another website.
 */
function safeReturnPath(raw: string | undefined) {
  if (!raw) return "/items"
  try {
    const url = new URL(raw, "http://x") // handles "/items/abc" and full URLs
    const path = url.pathname + url.search
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/signin")
      ? path
      : "/items"
  } catch {
    return "/items"
  }
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl } = await searchParams
  const returnTo = safeReturnPath(callbackUrl)

  const session = await auth()
  if (session?.user) redirect(returnTo)

  return (
    <div className="mx-auto flex w-full max-w-md flex-col justify-center px-4 py-20">
      <Card className="p-8">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to CampusShare</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Only <strong>@iiitdwd.ac.in</strong> accounts can sign in. That&apos;s the whole
          trust model — every borrow and return is tied to a real roll number, so no deposit
          or security money is needed.
        </p>

        <div className="mt-7">
          <SignInButton callbackUrl={returnTo} />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          A personal Gmail account will be refused. We store your institute email, name and
          profile picture — nothing else.
        </p>
      </Card>
    </div>
  )
}
