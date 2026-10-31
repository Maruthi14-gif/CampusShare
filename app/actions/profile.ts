"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { HOSTELS } from "@/lib/campus"

type Result = { ok: true } | { ok: false; error: string }

export async function saveProfile(input: { hostel: string; room?: string; phone?: string }): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  if (!(HOSTELS as readonly string[]).includes(input.hostel)) return { ok: false, error: "Pick your hostel." }

  const room = String(input.room ?? "").trim().toUpperCase() || null
  if (room && !/^[A-Z0-9-]{1,8}$/.test(room)) return { ok: false, error: "Room number looks wrong, e.g. 214 or B-12." }

  const digits = String(input.phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "")
  const phone = digits || null
  if (phone && !/^[6-9]\d{9}$/.test(phone)) return { ok: false, error: "Enter a 10-digit Indian mobile number." }

  await prisma.user.update({ where: { id: session.user.id }, data: { hostel: input.hostel, room, phone } })

  // Rooms are only usable while the lender has one on file.
  if (!room) await prisma.item.updateMany({ where: { ownerId: session.user.id }, data: { allowRoom: false } })

  revalidatePath("/", "layout")
  return { ok: true }
}
