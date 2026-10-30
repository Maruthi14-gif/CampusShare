"use client"

import { signIn, signOut } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui"

export function SignInButton({ callbackUrl = "/items" }: { callbackUrl?: string }) {
  const [busy, setBusy] = useState(false)
  return (
    <Button
      size="lg"
      disabled={busy}
      onClick={() => {
        setBusy(true)
        signIn("google", { callbackUrl })
      }}
      className="w-full"
    >
      {busy ? "Opening Google…" : "Continue with institute Google account"}
    </Button>
  )
}

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-lg px-3 py-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
    >
      Sign out
    </button>
  )
}
