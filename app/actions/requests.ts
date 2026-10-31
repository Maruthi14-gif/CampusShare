"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { CATEGORIES } from "@/lib/utils"
import { RULES } from "@/lib/campus"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; needsProfile?: boolean }

const DAY = 86_400_000

/** "I need a calculator by Thursday." Answered with fulfilRequest in loans.ts. */
export async function createRequest(input: {
  title: string
  category: string
  neededBy: string // YYYY-MM-DD
  note?: string
}): Promise<Result<{ requestId: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const me = session.user.id

  const user = await prisma.user.findUnique({ where: { id: me }, select: { hostel: true } })
  if (!user?.hostel) return { ok: false, error: "Add your hostel on your profile first.", needsProfile: true }

  const title = String(input.title ?? "").trim()
  if (title.length < 3) return { ok: false, error: "Say what you need." }
  if (title.length > 80) return { ok: false, error: "Keep it under 80 characters." }
  if (!(CATEGORIES as readonly string[]).includes(input.category)) return { ok: false, error: "Pick a category." }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(input.neededBy ?? ""))) return { ok: false, error: "Pick the date you need it by." }
  const neededBy = new Date(`${input.neededBy}T23:59:59+05:30`)
  if (neededBy.getTime() < Date.now()) return { ok: false, error: "That date has already passed." }
  if (neededBy.getTime() > Date.now() + 30 * DAY) return { ok: false, error: "Requests can be up to 30 days ahead." }

  const note = String(input.note ?? "").trim().slice(0, 200) || null

  const open = await prisma.request.count({
    where: { userId: me, status: "OPEN", neededBy: { gte: new Date() } },
  })
  if (open >= RULES.maxOpenRequests)
    return { ok: false, error: `You can have ${RULES.maxOpenRequests} open requests. Close one first.` }

  const req = await prisma.request.create({
    data: { userId: me, title, category: input.category, neededBy, note },
    select: { id: true },
  })
  revalidatePath("/requests")
  return { ok: true, requestId: req.id }
}

export async function closeRequest(requestId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  const closed = await prisma.request.updateMany({
    where: { id: requestId, userId: session.user.id, status: "OPEN" },
    data: { status: "CLOSED" },
  })
  if (closed.count !== 1) return { ok: false, error: "This request is already closed." }
  revalidatePath("/requests")
  return { ok: true }
}
