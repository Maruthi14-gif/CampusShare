// ─────────────────────────────────────────────────────────────
//  app/actions/items.ts
//  Server Actions for listing an item and generating its QR code.
// ─────────────────────────────────────────────────────────────

"use server"

import { revalidatePath } from "next/cache"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

type Result<T = {}> = ({ ok: true } & T) | { ok: false; error: string }

/**
 * Item codes look like CS-0147 and are printed on the sticker.
 * Random 4 digits, retried if taken — fine at campus scale, and
 * short enough that someone can type it by hand if a tag is torn.
 */
async function generateItemCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = `CS-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`
    const taken = await prisma.item.findUnique({ where: { code }, select: { id: true } })
    if (!taken) return code
  }
  // Fallback that cannot collide
  return `CS-${Date.now().toString().slice(-6)}`
}

export async function createItem(input: {
  title: string
  category: string
  description?: string
  condition?: string
  imageUrl?: string
  slot?: string
}): Promise<Result<{ itemId: string; code: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const title = input.title?.trim()
  if (!title) return { ok: false, error: "Give the item a name." }
  if (!input.category) return { ok: false, error: "Pick a category." }

  const code = await generateItemCode()

  const item = await prisma.item.create({
    data: {
      code,
      title,
      category: input.category,
      description: input.description?.trim() || null,
      condition: input.condition ?? "good",
      imageUrl: input.imageUrl || null,
      slot: input.slot || null,
      ownerId: session.user.id,
      status: "AVAILABLE",
    },
    select: { id: true, code: true },
  })

  revalidatePath("/items")
  revalidatePath("/dashboard")
  return { ok: true, itemId: item.id, code: item.code }
}

export async function deleteItem(itemId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const item = await prisma.item.findUnique({
    where: { id: itemId },
    select: { ownerId: true, status: true },
  })
  if (!item) return { ok: false, error: "Item not found." }
  if (item.ownerId !== session.user.id) return { ok: false, error: "That isn't your item." }
  if (item.status !== "AVAILABLE")
    return { ok: false, error: "You can't remove an item that is currently out on loan." }

  await prisma.item.delete({ where: { id: itemId } })
  revalidatePath("/items")
  revalidatePath("/dashboard")
  return { ok: true }
}
