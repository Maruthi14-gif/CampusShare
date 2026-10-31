/**
 * Email notifications through Resend (free tier: 100 emails a day).
 *
 * Off until both RESEND_API_KEY and EMAIL_FROM are set in the environment.
 * Until then every call is a no-op, so the app works the same without it.
 * Never throws: a failed email must not break a loan action.
 */
export async function sendEmail(to: string | null | undefined, subject: string, text: string) {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM
  if (!key || !from || !to) return false
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text: `${text}\n\n— CampusShare` }),
      signal: AbortSignal.timeout(5000),
    })
    return res.ok
  } catch {
    return false
  }
}

export function appUrl(path = "") {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  return `${base}${path}`
}
