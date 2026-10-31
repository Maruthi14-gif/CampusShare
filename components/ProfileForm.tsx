"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveProfile } from "@/app/actions/profile"
import { HOSTELS } from "@/lib/campus"
import { Button, Card, Field, Input, Select } from "@/components/ui"

export function ProfileForm({
  initial,
  next,
}: {
  initial: { hostel: string | null; room: string | null; phone: string | null }
  next: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function onSubmit(fd: FormData) {
    setError(null)
    setSaved(false)
    start(async () => {
      const res = await saveProfile({
        hostel: String(fd.get("hostel") ?? ""),
        room: String(fd.get("room") ?? ""),
        phone: String(fd.get("phone") ?? ""),
      })
      if (!res.ok) return setError(res.error)
      setSaved(true)
      if (next) router.push(next)
      else router.refresh()
    })
  }

  return (
    <Card className="p-6 sm:p-8">
      <form action={onSubmit} className="space-y-5">
        <Field label="Your hostel" hint="Students in the same hostel can hand over at a room. Everyone else meets at a public spot.">
          <Select name="hostel" required defaultValue={initial.hostel ?? ""}>
            <option value="" disabled>
              Choose your hostel
            </option>
            {HOSTELS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Room number (optional)"
          hint="Private. Shown only to a borrower from your own hostel, and only for items where you allow room handovers."
        >
          <Input name="room" defaultValue={initial.room ?? ""} placeholder="e.g. 214" maxLength={8} />
        </Field>

        <Field
          label="Mobile number (optional)"
          hint="Private. Shown only to the other student while you have a loan together, so you can WhatsApp each other."
        >
          <Input
            name="phone"
            defaultValue={initial.phone ?? ""}
            placeholder="10-digit mobile"
            inputMode="tel"
            maxLength={14}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">{error}</p>
        )}
        {saved && !next && (
          <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
            Saved.
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Saving…" : next ? "Save and continue" : "Save profile"}
        </Button>
      </form>
    </Card>
  )
}
