"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createItem } from "@/app/actions/items"
import { fulfilRequest } from "@/app/actions/loans"
import { CATEGORIES } from "@/lib/utils"
import { MEET_SPOTS } from "@/lib/campus"
import { PhotoInput } from "@/components/PhotoInput"
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui"

export function NewItemForm({
  hasRoom,
  hostel,
  forRequest,
}: {
  hasRoom: boolean
  hostel: string
  /** Set when listing in answer to someone's request. */
  forRequest: { id: string; title: string; category: string; who: string } | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [photo, setPhoto] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)

  function onSubmit(formData: FormData) {
    setError(null)
    setNeedsProfile(false)
    start(async () => {
      const res = await createItem({
        title: String(formData.get("title") ?? ""),
        category: String(formData.get("category") ?? ""),
        description: String(formData.get("description") ?? ""),
        condition: String(formData.get("condition") ?? "good"),
        meetSpot: String(formData.get("meetSpot") ?? ""),
        allowRoom: formData.get("allowRoom") === "on",
        imageUrl: photo || undefined,
      })
      if (!res.ok) {
        setError(res.error)
        setNeedsProfile(!!res.needsProfile)
        return
      }
      if (forRequest) {
        const lent = await fulfilRequest(forRequest.id, res.itemId)
        if (!lent.ok) {
          // The item is listed either way; just say why it wasn't lent.
          router.push(`/items/${res.itemId}?new=1&requestFailed=${encodeURIComponent(lent.error)}`)
          return
        }
      }
      router.push(`/items/${res.itemId}?new=1`)
    })
  }

  return (
    <Card className="p-6 sm:p-8">
      {forRequest && (
        <p className="mb-6 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-900 ring-1 ring-indigo-200">
          You&apos;re lending this to <strong>{forRequest.who}</strong>, who asked for &ldquo;{forRequest.title}&rdquo;. It
          will be reserved for them as soon as you list it.
        </p>
      )}

      <form action={onSubmit} className="space-y-5">
        <Field label="What is it?" hint="Be specific — “Casio FX-991EX” beats “calculator”.">
          <Input
            name="title"
            required
            maxLength={80}
            placeholder="Casio FX-991EX calculator"
            defaultValue={forRequest?.title ?? ""}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select name="category" required defaultValue={forRequest?.category ?? ""}>
              <option value="" disabled>
                Choose one
              </option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Condition">
            <Select name="condition" defaultValue="good">
              <option value="good">Good — works perfectly</option>
              <option value="fair">Fair — some wear</option>
              <option value="worn">Worn — usable but marked</option>
            </Select>
          </Field>
        </div>

        <Field label="Anything the borrower should know?" hint="Optional. Missing cap, stiff button, needs batteries…">
          <Textarea name="description" rows={3} maxLength={300} />
        </Field>

        <PhotoInput name="photo" label="Photo of the item" value={photo} onChange={setPhoto} />
        {!photo && (
          <p className="-mt-3 text-xs text-slate-500">
            No photo? We&apos;ll show a labelled stock photo until you add one.
          </p>
        )}

        <fieldset className="space-y-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <legend className="sr-only">Handover</legend>
          <Field label="Where will you hand it over?" hint="A busy public place. Used for borrowers from other hostels.">
            <Select name="meetSpot" required defaultValue={MEET_SPOTS[0]}>
              {MEET_SPOTS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <label className={`flex items-start gap-2.5 text-sm ${hasRoom ? "text-slate-700" : "text-slate-500"}`}>
            <input
              type="checkbox"
              name="allowRoom"
              disabled={!hasRoom}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            <span>
              Students from {hostel} can collect it from my room
              {!hasRoom && (
                <>
                  {" "}
                  —{" "}
                  <Link href="/profile?next=/items/new" className="text-indigo-600 underline underline-offset-2">
                    add your room number
                  </Link>{" "}
                  first
                </>
              )}
            </span>
          </label>
        </fieldset>

        {error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}{" "}
            {needsProfile && (
              <Link href="/profile?next=/items/new" className="font-medium underline underline-offset-2">
                Open profile
              </Link>
            )}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Listing…" : forRequest ? `List it and lend to ${forRequest.who}` : "List it"}
        </Button>
      </form>
    </Card>
  )
}
