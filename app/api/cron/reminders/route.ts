import { prisma } from "@/lib/prisma"
import { runHousekeeping } from "@/lib/rules"
import { appUrl, sendEmail } from "@/lib/notify"

export const dynamic = "force-dynamic"

/**
 * Daily job, scheduled in vercel.json (09:00 IST).
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set;
 * anything else is refused, so outsiders can't trigger emails.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  await runHousekeeping()

  // Due within the next 24 hours, or already overdue.
  const soon = new Date(Date.now() + 24 * 3_600_000)
  const loans = await prisma.loan.findMany({
    where: { status: { in: ["ISSUED", "COLLECTED"] }, dueAt: { lt: soon } },
    include: { borrower: { select: { email: true } }, item: { select: { id: true, title: true } } },
    take: 200,
  })

  let sent = 0
  for (const l of loans) {
    const overdue = l.dueAt.getTime() < Date.now()
    const ok = await sendEmail(
      l.borrower.email,
      overdue ? `${l.item.title} is overdue` : `${l.item.title} is due tomorrow`,
      `${overdue ? "Please return it today." : "Please return it by tomorrow."} Ask the owner for the return code when you hand it back.\n${appUrl(`/items/${l.item.id}`)}`
    )
    if (ok) sent++
  }
  return Response.json({ checked: loans.length, sent })
}
