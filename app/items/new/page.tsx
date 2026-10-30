import { NewItemForm } from "@/components/NewItemForm"

export const dynamic = "force-dynamic"

export default function NewItemPage() {
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
