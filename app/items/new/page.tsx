import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { NewItemForm } from "@/components/NewItemForm"

export const dynamic = "force-dynamic"

export default async function NewItemPage() {
  // Belt and braces with proxy.ts: never show the form to a signed-out
  // visitor, who would fill it in only to be told to sign in on submit.
  const session = await auth()
  if (!session?.user?.id) redirect("/signin")

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">Lend an item</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        Takes about a minute. You&apos;ll get a QR tag to print and stick on it.
      </p>
      <div className="mt-8">
        <NewItemForm />
      </div>
    </div>
  )
}
