import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { SignInButton } from "@/components/AuthButtons"
import { Card } from "@/components/ui"

export default async function SignInPage() {
  const session = await auth()
  if (session?.user) redirect("/items")

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
          <SignInButton />
        </div>

        <p className="mt-6 text-xs leading-relaxed text-slate-500">
          A personal Gmail account will be refused. We store your institute email, name and
          profile picture — nothing else.
        </p>
      </Card>
    </div>
  )
}
