// ─────────────────────────────────────────────────────────────
//  app/actions/items.ts
//  Server Actions for listing an item and generating its QR code.
// ─────────────────────────────────────────────────────────────

"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { CATEGORIES, CONDITIONS, SLOTS, isValidPhoto } from "@/lib/utils"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string }

const MAX_TITLE = 80
const MAX_DESCRIPTION = 300

/**
 * Item codes look like CS-0147 and are printed on the sticker.
 * Random 4 digits — short enough that someone can type it by hand if a
 * tag is torn. Uniqueness is enforced by the database, not by a lookup
 * first: two students listing at the same instant could both "see" a
 * free code, so instead we just insert and retry if Postgres says taken.
 */
function randomItemCode() {
  return `CS-${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`
}

function isUniqueViolation(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
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

  // Everything below arrives from the browser — check it all again here.
  const title = input.title?.trim()
  if (!title) return { ok: false, error: "Give the item a name." }
  if (title.length > MAX_TITLE)
    return { ok: false, error: `Keep the name under ${MAX_TITLE} characters.` }

  if (!(CATEGORIES as readonly string[]).includes(input.category))
    return { ok: false, error: "Pick a category." }

  const condition = input.condition || "good"
  if (!(CONDITIONS as readonly string[]).includes(condition))
    return { ok: false, error: "Pick a condition." }

  const slot = input.slot || null
  if (slot && !(SLOTS as readonly string[]).includes(slot))
    return { ok: false, error: "Pick one of the numbered slots." }

  const description = input.description?.trim() || null
  if (description && description.length > MAX_DESCRIPTION)
    return { ok: false, error: `Keep the note under ${MAX_DESCRIPTION} characters.` }

  const imageUrl = input.imageUrl || null
  if (imageUrl && !isValidPhoto(imageUrl))
    return { ok: false, error: "That photo couldn't be saved. Try taking it again." }

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = attempt < 7 ? randomItemCode() : `CS-${Date.now().toString().slice(-6)}`
    try {
      const item = await prisma.item.create({
        data: {
          code,
          title,
          category: input.category,
          description,
          condition,
          imageUrl,
          slot,
          ownerId: session.user.id,
          status: "AVAILABLE",
        },
        select: { id: true, code: true },
      })

      revalidatePath("/items")
      revalidatePath("/dashboard")
      return { ok: true, itemId: item.id, code: item.code }
    } catch (e) {
      if (isUniqueViolation(e)) continue // code taken — roll again
      console.error("createItem failed", e)
      return { ok: false, error: "Could not list the item. Please try again." }
    }
  }
  return { ok: false, error: "Could not list the item. Please try again." }
}

export async function deleteItem(itemId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  // One statement: only deletes if it is mine AND nobody has reserved it.
  // A separate "check status, then delete" would let a reservation land in
  // between, and the cascade would silently wipe that borrower's loan.
  const removed = await prisma.item.deleteMany({
    where: { id: itemId, ownerId: session.user.id, status: "AVAILABLE" },
  })

  if (removed.count === 0) {
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { ownerId: true },
    })
    if (!item) return { ok: false, error: "Item not found." }
    if (item.ownerId !== session.user.id) return { ok: false, error: "That isn't your item." }
    return { ok: false, error: "You can't remove an item that is currently out on loan." }
  }

  revalidatePath("/items")
  revalidatePath("/dashboard")
  return { ok: true }
}
