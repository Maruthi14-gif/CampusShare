"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  answerExtension,
  cancelReservation,
  markIssued,
  markLost,
  markReturned,
  markVerified,
  reportProblem,
  reportStudent,
  requestEarlyReturn,
  requestExtension,
  reserveItem,
} from "@/app/actions/loans"
import { joinWaitlist, leaveWaitlist, setPaused } from "@/app/actions/items"
import { PhotoInput } from "@/components/PhotoInput"
import { Button } from "@/components/ui"

type Res = { ok: true } | { ok: false; error: string; needsProfile?: boolean }

/**
 * @param refreshOnError reload the page's data after a failure too. Only the
 *   code forms want this (a fresh code may have been issued). Elsewhere it
 *   would swap the button away and hide the error message with it.
 */
function useAction({ refreshOnError = false } = {}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [needsProfile, setNeedsProfile] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  function run(fn: () => Promise<Res & Record<string, unknown>>, onDone?: (r: never) => void) {
    setError(null)
    setNote(null)
    setNeedsProfile(false)
    start(async () => {
      const res = await fn()
      if (!res.ok) {
        setError(res.error)
        setNeedsProfile(!!res.needsProfile)
        if (refreshOnError) router.refresh()
        return
      }
      onDone?.(res as never)
      router.refresh()
    })
  }

  return { pending, error, note, setNote, needsProfile, run }
}

function Msg({ error, note, profileNext }: { error: string | null; note: string | null; profileNext?: string }) {
  if (error)
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
        {error}{" "}
        {profileNext && (
          <Link href={`/profile?next=${encodeURIComponent(profileNext)}`} className="font-medium underline underline-offset-2">
            Open profile
          </Link>
        )}
      </p>
    )
  if (note)
    return (
      <p role="status" className="rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800 ring-1 ring-emerald-200">
        {note}
      </p>
    )
  return null
}

/** Four big digits, the way an OTP is shown on a delivery app. */
export function CodeDigits({ code, label }: { code: string; label: string }) {
  return (
    <div className="flex justify-center py-1">
      <div className="inline-grid -rotate-2 gap-1.5 rounded-xl border-[3px] border-stamp px-5 py-3 text-center text-stamp">
        <p className="font-mono text-[11px] font-bold tracking-[0.12em]">{label}</p>
        <p className="font-mono text-4xl font-bold leading-none tracking-[0.25em]" aria-label={code.split("").join(" ")}>
          {code}
        </p>
      </div>
    </div>
  )
}

function CodeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••"
        aria-label={label}
        className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-center font-mono text-2xl tracking-[0.5em] ring-1 ring-inset ring-slate-300 outline-none focus:ring-2 focus:ring-indigo-500"
      />
    </label>
  )
}

/* ── Borrower: reserve ─────────────────────────────────── */

export function ReserveButton({ itemId, held }: { itemId: string; held?: boolean }) {
  const { pending, error, needsProfile, run } = useAction()
  return (
    <div className="space-y-3">
      {held && (
        <p className="rounded-xl bg-indigo-50 px-3.5 py-2.5 text-sm text-indigo-900 ring-1 ring-indigo-200">
          It&apos;s your turn from the waitlist. Reserve it before the hold runs out.
        </p>
      )}
      <Button size="lg" className="w-full" disabled={pending} onClick={() => run(() => reserveItem(itemId))}>
        {pending ? "Reserving…" : "Reserve for 3 days"}
      </Button>
      <Msg error={error} note={null} profileNext={needsProfile ? `/items/${itemId}` : undefined} />
    </div>
  )
}

/* ── Owner: hand over (types the borrower's code) ──────── */

export function HandoverForm({ loanId, borrowerName }: { loanId: string; borrowerName: string }) {
  const { pending, error, note, run } = useAction({ refreshOnError: true })
  const [photo, setPhoto] = useState("")
  const [code, setCode] = useState("")

  return (
    <div className="space-y-4">
      <ol className="space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
        <li>1. Meet {borrowerName} and take a photo of the item.</li>
        <li>2. Ask for their 4-digit pickup code and type it below.</li>
        <li>3. Hand it over.</li>
      </ol>
      <PhotoInput name="issuePhoto" label="Condition photo at handover" value={photo} onChange={setPhoto} required />
      <CodeInput value={code} onChange={setCode} label={`${borrowerName}'s pickup code`} />
      <Button
        className="w-full"
        disabled={pending || !photo || code.length !== 4}
        onClick={() => run(() => markIssued(loanId, code, photo), () => setCode(""))}
      >
        {pending ? "Checking…" : "Confirm handover"}
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Borrower: return (types the owner's return code) ──── */

export function ReturnForm({ loanId, ownerName }: { loanId: string; ownerName: string }) {
  const { pending, error, note, run } = useAction({ refreshOnError: true })
  const [photo, setPhoto] = useState("")
  const [code, setCode] = useState("")
  const [thanks, setThanks] = useState("")

  return (
    <div className="space-y-4">
      <ol className="space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
        <li>1. Meet {ownerName} and take a photo of the item.</li>
        <li>2. Give it back and ask for their 4-digit return code.</li>
        <li>3. Type the code below.</li>
      </ol>
      <PhotoInput name="returnPhoto" label="Condition photo on return" value={photo} onChange={setPhoto} required />
      <CodeInput value={code} onChange={setCode} label={`${ownerName}'s return code`} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-slate-700">
          Say thanks to {ownerName} <span className="font-normal text-slate-500">(optional)</span>
        </span>
        <input
          value={thanks}
          onChange={(e) => setThanks(e.target.value.slice(0, 140))}
          maxLength={140}
          placeholder="Saved me in the maths exam!"
          className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm ring-1 ring-inset ring-slate-300 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500"
        />
        <span className="block text-xs text-slate-500">It shows on {ownerName}&apos;s profile.</span>
      </label>
      <Button
        className="w-full"
        disabled={pending || !photo || code.length !== 4}
        onClick={() => run(() => markReturned(loanId, code, photo, undefined, thanks), () => setCode(""))}
      >
        {pending ? "Checking…" : "Confirm return"}
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Owner: close the loan after checking the photos ───── */

export function CloseLoanForm({ loanId }: { loanId: string }) {
  const { pending, error, note, run } = useAction()
  const [problem, setProblem] = useState(false)
  const [text, setText] = useState("")

  return (
    <div className="space-y-3">
      {!problem ? (
        <>
          <Button className="w-full" disabled={pending} onClick={() => run(() => markVerified(loanId))}>
            {pending ? "Saving…" : "Condition is fine — close the loan"}
          </Button>
          <Button variant="ghost" size="sm" className="w-full text-rose-600" onClick={() => setProblem(true)}>
            Report a problem instead
          </Button>
        </>
      ) : (
        <>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">What&apos;s wrong?</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={300}
              placeholder="e.g. Screen is cracked, it wasn't before."
              className="w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm ring-1 ring-inset ring-slate-300 outline-none focus:ring-2 focus:ring-rose-400"
            />
          </label>
          <p className="text-xs text-slate-500">
            The loan closes with your note and both photos as the record. Your item is paused until you relist it.
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setProblem(false)}>
              Back
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              disabled={pending || text.trim().length < 5}
              onClick={() => run(() => reportProblem(loanId, text))}
            >
              {pending ? "Saving…" : "Report problem"}
            </Button>
          </div>
        </>
      )}
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Either side: cancel before handover ───────────────── */

export function CancelButton({ loanId }: { loanId: string }) {
  const { pending, error, note, run } = useAction()
  return (
    <div className="space-y-2">
      <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => cancelReservation(loanId))}>
        {pending ? "Cancelling…" : "Cancel reservation"}
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Borrower: ask for more days ───────────────────────── */

export function ExtensionAsk({ loanId, maxDays }: { loanId: string; maxDays: number }) {
  const { pending, error, note, setNote, run } = useAction()
  const [days, setDays] = useState(2)
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Extra days"
          className="rounded-xl border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-300"
        >
          {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              +{d} day{d === 1 ? "" : "s"}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => run(() => requestExtension(loanId, days), () => setNote("Asked. The owner will approve or decline."))}
        >
          Ask for more time
        </Button>
      </div>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Owner: answer an extension request ────────────────── */

export function ExtensionAnswer({ loanId, days, who }: { loanId: string; days: number; who: string }) {
  const { pending, error, note, run } = useAction()
  return (
    <div className="space-y-2 rounded-xl bg-amber-50 p-4 ring-1 ring-amber-200">
      <p className="text-sm text-amber-900">
        {who} asked for <strong>{days} more day{days === 1 ? "" : "s"}</strong>.
      </p>
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => run(() => answerExtension(loanId, true))}>
          Approve
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => answerExtension(loanId, false))}>
          Decline
        </Button>
      </div>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Owner: ask for it back early ──────────────────────── */

export function EarlyReturnButton({ loanId }: { loanId: string }) {
  const { pending, error, note, setNote, run } = useAction()
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={pending}
        onClick={() => run(() => requestEarlyReturn(loanId), () => setNote("Asked. The borrower will see your request."))}
      >
        I need it back early
      </Button>
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Either side: mark lost ────────────────────────────── */

export function LostButton({ loanId, byOwner }: { loanId: string; byOwner: boolean }) {
  const { pending, error, note, run } = useAction()
  const [sure, setSure] = useState(false)
  return (
    <div className="space-y-2">
      {!sure ? (
        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setSure(true)}>
          {byOwner ? "Mark as lost" : "I lost it"}
        </Button>
      ) : (
        <div className="space-y-2 rounded-xl bg-rose-50 p-3 ring-1 ring-rose-200">
          <p className="text-sm text-rose-900">
            {byOwner
              ? "This closes the loan as lost and counts against the borrower."
              : "This closes the loan as lost. Sort out a replacement with the owner directly."}
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setSure(false)}>
              Back
            </Button>
            <Button size="sm" variant="danger" disabled={pending} onClick={() => run(() => markLost(loanId))}>
              {pending ? "Saving…" : "Yes, mark lost"}
            </Button>
          </div>
        </div>
      )}
      <Msg error={error} note={note} />
    </div>
  )
}

/* ── Anyone: waitlist ──────────────────────────────────── */

export function WaitlistButton({ itemId, joined, position }: { itemId: string; joined: boolean; position: number | null }) {
  const { pending, error, run } = useAction()
  return (
    <div className="space-y-2">
      {joined ? (
        <>
          <p className="text-sm text-slate-600">
            You&apos;re <strong>#{position}</strong> on the waitlist. When it&apos;s free, it&apos;s held for the first person in line.
          </p>
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => leaveWaitlist(itemId))}>
            Leave waitlist
          </Button>
        </>
      ) : (
        <Button variant="secondary" className="w-full" disabled={pending} onClick={() => run(() => joinWaitlist(itemId))}>
          {pending ? "Joining…" : "Join the waitlist"}
        </Button>
      )}
      <Msg error={error} note={null} />
    </div>
  )
}

/* ── Owner: pause / relist ─────────────────────────────── */

export function PauseToggle({ itemId, paused }: { itemId: string; paused: boolean }) {
  const { pending, error, run } = useAction()
  return (
    <div className="space-y-2">
      <Button variant="secondary" size="sm" disabled={pending} onClick={() => run(() => setPaused(itemId, !paused))}>
        {paused ? "Relist it — make it available" : "Pause lending (away / fixing it)"}
      </Button>
      <Msg error={error} note={null} />
    </div>
  )
}

/* ── Either side: report the other student ─────────────── */

export function ReportStudent({ loanId, who }: { loanId: string; who: string }) {
  const { pending, error, note, setNote, run } = useAction()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-600">
        Report {who}
      </button>
    )
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="What happened? The organisers will review it."
        className="w-full rounded-lg border-0 bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-300 outline-none"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={pending || text.trim().length < 10}
          onClick={() => run(() => reportStudent(loanId, text), () => { setNote("Report sent. Thank you."); setText("") })}
        >
          Send report
        </Button>
      </div>
      <Msg error={error} note={note} />
    </div>
  )
}
