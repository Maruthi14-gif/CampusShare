"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  cancelReservation,
  markCollected,
  markIssued,
  markReturned,
  markVerified,
  reserveItem,
} from "@/app/actions/loans"
import { PhotoInput } from "@/components/PhotoInput"
import { Button } from "@/components/ui"

type Res = { ok: true } | { ok: false; error: string }

function useAction() {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  function run(fn: () => Promise<Res & Record<string, unknown>>, onDone?: (r: never) => void) {
    setError(null)
    setNote(null)
    start(async () => {
      const res = await fn()
      if (!res.ok) {
        setError(res.error)
        return
      }
      onDone?.(res as never)
      router.refresh()
    })
  }

  return { pending, error, note, setNote, run }
}

function Msg({ error, note }: { error: string | null; note: string | null }) {
  if (error)
    return (
      <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
        {error}
      </p>
    )
  if (note)
    return (
      <p className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
        {note}
      </p>
    )
  return null
}

/* ── Borrower: reserve ─────────────────────────────────── */

export function ReserveButton({ itemId }: { itemId: string }) {
  const { pending, error, note, setNote, run } = useAction()

  return (
    <div className="space-y-3">
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          run(
            () => reserveItem(itemId, 3),
            (r: { pickupCode: string }) =>
              setNote(`Reserved. Your pickup code is ${r.pickupCode}. Due in 3 days.`)
          )
        }
      >
        {pending ? "Reserving…" : "Reserve for 3 days"}
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Owner: issue (needs a photo) ──────────────────────── */

export function IssueForm({ loanId }: { loanId: string }) {
  const { pending, error, note, run } = useAction()
  const [photo, setPhoto] = useState("")

  return (
    <div className="space-y-3">
      <PhotoInput
        name="issuePhoto"
        label="Condition photo before handover"
        value={photo}
        onChange={setPhoto}
        required
      />
      <Button
        className="w-full"
        disabled={pending || !photo}
        onClick={() => run(() => markIssued(loanId, photo))}
      >
        {pending ? "Saving…" : "Mark as issued"}
      </Button>
      {!photo && (
        <p className="text-xs text-slate-500">
          The photo is what makes damage arguable later. It isn&apos;t optional.
        </p>
      )}
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Borrower: collect ─────────────────────────────────── */

export function CollectButton({ loanId }: { loanId: string }) {
  const { pending, error, note, run } = useAction()
  return (
    <div className="space-y-3">
      <Button className="w-full" disabled={pending} onClick={() => run(() => markCollected(loanId))}>
        {pending ? "Saving…" : "I've collected it"}
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Borrower: return (needs a photo) ──────────────────── */

export function ReturnForm({ loanId }: { loanId: string }) {
  const { pending, error, note, run } = useAction()
  const [photo, setPhoto] = useState("")

  return (
    <div className="space-y-3">
      <PhotoInput
        name="returnPhoto"
        label="Condition photo on return"
        value={photo}
        onChange={setPhoto}
        required
      />
      <Button
        className="w-full"
        disabled={pending || !photo}
        onClick={() => run(() => markReturned(loanId, photo))}
      >
        {pending ? "Saving…" : "Mark as returned"}
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Owner: verify ─────────────────────────────────────── */

export function VerifyButton({ loanId }: { loanId: string }) {
  const { pending, error, note, run } = useAction()
  return (
    <div className="space-y-3">
      <Button className="w-full" disabled={pending} onClick={() => run(() => markVerified(loanId))}>
        {pending ? "Saving…" : "Condition is fine — close the loan"}
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Either side: cancel ───────────────────────────────── */

export function CancelButton({ loanId }: { loanId: string }) {
  const { pending, error, note, run } = useAction()
  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => run(() => cancelReservation(loanId))}
      >
        {pending ? "Cancelling…" : "Cancel reservation"}
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}
