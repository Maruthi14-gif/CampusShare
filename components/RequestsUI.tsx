"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { closeRequest, createRequest } from "@/app/actions/requests"
import { fulfilRequest } from "@/app/actions/loans"
import { CATEGORIES } from "@/lib/utils"
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui"

/* ── Post a request ────────────────────────────────────── */

export function RequestForm({ today }: { today: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [done, setDone] = useState(false)

  function onSubmit(fd: FormData) {
    setError(null)
    setDone(false)
    start(async () => {
      const res = await createRequest({
        title: String(fd.get("title") ?? ""),
        category: String(fd.get("category") ?? ""),
        neededBy: String(fd.get("neededBy") ?? ""),
        note: String(fd.get("note") ?? ""),
      })
      if (!res.ok) {
        setError(res.error)
        setNeedsProfile(!!res.needsProfile)
        return
      }
      setDone(true)
      router.refresh()
    })
  }

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold tracking-tight">Need something?</h2>
      <p className="mt-1 text-sm text-slate-600">Post it here. Anyone who has one can lend it to you in one tap.</p>
      <form action={onSubmit} className="mt-5 space-y-4" key={done ? "sent" : "form"}>
        <Field label="What do you need?">
          <Input name="title" required maxLength={80} placeholder="Scientific calculator" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field label="Needed by">
            <Input name="neededBy" type="date" required min={today} />
          </Field>
        </div>
        <Field label="Note (optional)">
          <Textarea name="note" rows={2} maxLength={200} placeholder="For the Maths end-sem on Thursday" />
        </Field>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error}{" "}
            {needsProfile && (
              <Link href="/profile?next=/requests" className="font-medium underline underline-offset-2">
                Open profile
              </Link>
            )}
          </p>
        )}
        {done && (
          <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
            Posted. Share it on WhatsApp to get a faster answer.
          </p>
        )}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Posting…" : "Post request"}
        </Button>
      </form>
    </Card>
  )
}

/* ── One request card's actions ────────────────────────── */

export function RequestActions({
  requestId,
  mine,
  signedIn,
  myItems,
  shareText,
}: {
  requestId: string
  mine: boolean
  signedIn: boolean
  myItems: { id: string; title: string }[]
  shareText: string
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [offering, setOffering] = useState(false)
  const [pick, setPick] = useState(myItems[0]?.id ?? "")

  const share = (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 items-center rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white"
    >
      Share on WhatsApp
    </a>
  )

  if (mine)
    return (
      <div className="flex flex-wrap items-center gap-2">
        {share}
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await closeRequest(requestId)
              if (!r.ok) setError(r.error)
              router.refresh()
            })
          }
        >
          Close request
        </Button>
        {error && <p className="w-full text-xs text-red-600">{error}</p>}
      </div>
    )

  if (!signedIn)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/signin?callbackUrl=%2Frequests" className="inline-flex h-9 items-center rounded-xl bg-slate-950 px-3.5 text-xs font-semibold text-white">
          Sign in to help
        </Link>
        {share}
      </div>
    )

  return (
    <div className="space-y-3">
      {!offering ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setOffering(true)}>
            I can lend this
          </Button>
          {share}
        </div>
      ) : (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          {myItems.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                aria-label="Which of your items"
                className="min-w-0 flex-1 rounded-xl border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-300"
              >
                {myItems.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
              </select>
              <Button
                size="sm"
                disabled={pending || !pick}
                onClick={() =>
                  start(async () => {
                    setError(null)
                    const r = await fulfilRequest(requestId, pick)
                    if (!r.ok) return setError(r.error)
                    router.push(`/items/${pick}`)
                  })
                }
              >
                {pending ? "Lending…" : "Lend this one"}
              </Button>
            </div>
          )}
          <Link href={`/items/new?request=${requestId}`} className="block text-sm font-medium text-indigo-600 underline underline-offset-2">
            {myItems.length > 0 ? "Or list a new item for it" : "List your item for it (takes a minute)"}
          </Link>
          <button type="button" onClick={() => setOffering(false)} className="text-xs text-slate-500">
            Cancel
          </button>
        </div>
      )}
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
