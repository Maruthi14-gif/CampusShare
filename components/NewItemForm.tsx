"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createItem } from "@/app/actions/items"
import { CATEGORIES, SLOTS } from "@/lib/utils"
import { PhotoInput } from "@/components/PhotoInput"
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui"

export function NewItemForm() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [photo, setPhoto] = useState("")
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    start(async () => {
      const res = await createItem({
        title: String(formData.get("title") ?? ""),
        category: String(formData.get("category") ?? ""),
        description: String(formData.get("description") ?? ""),
        condition: String(formData.get("condition") ?? "good"),
        slot: String(formData.get("slot") ?? ""),
        imageUrl: photo || undefined,
      })

      if (!res.ok) {
        setError(res.error)
        return
      }
      router.push(`/items/${res.itemId}?new=1`)
    })
  }

  return (
    <Card className="p-6 sm:p-8">
      <form action={onSubmit} className="space-y-5">
        <Field label="What is it?" hint="Be specific — “Casio FX-991EX” beats “calculator”.">
          <Input name="title" required maxLength={80} placeholder="Casio FX-991EX calculator" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category">
            <Select name="category" required defaultValue="">
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

        <Field
          label="Anything the borrower should know?"
          hint="Optional. Missing cap, stiff button, needs batteries…"
        >
          <Textarea name="description" rows={3} maxLength={300} />
        </Field>

        <PhotoInput
          name="photo"
          label="Photo of the item"
          value={photo}
          onChange={setPhoto}
        />

        <Field
          label="Which slot will you leave it in?"
          hint="The numbered slots on the CampusShare box in your hostel block."
        >
          <Select name="slot" defaultValue="">
            <option value="">Decide later</option>
            {SLOTS.map((s) => (
              <option key={s} value={s}>
                Slot {s}
              </option>
            ))}
          </Select>
        </Field>

        {error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Listing…" : "List it and print a tag"}
        </Button>
      </form>
    </Card>
  )
}
