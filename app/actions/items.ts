// ─────────────────────────────────────────────────────────────
//  app/actions/items.ts
//  Listing, pausing, deleting items, and their waitlists.
// ─────────────────────────────────────────────────────────────

"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@prisma/client"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { CATEGORIES, CONDITIONS, isValidPhoto } from "@/lib/utils"
import { MEET_SPOTS } from "@/lib/campus"
import { promoteWaitlist } from "@/lib/rules"

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; needsProfile?: boolean }

const MAX_TITLE = 80
const MAX_DESCRIPTION = 300

function refresh(itemId?: string) {
  revalidatePath("/items")
  revalidatePath("/dashboard")
  if (itemId) revalidatePath(`/items/${itemId}`)
}

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
  meetSpot?: string
  allowRoom?: boolean
}): Promise<Result<{ itemId: string; code: string }>> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hostel: true, room: true },
  })
  if (!me?.hostel) return { ok: false, error: "Add your hostel on your profile first.", needsProfile: true }

  // Everything below arrives from the browser — check it all again here.
  const title = input.title?.trim()
  if (!title) return { ok: false, error: "Give the item a name." }
  if (title.length > MAX_TITLE) return { ok: false, error: `Keep the name under ${MAX_TITLE} characters.` }

  if (!(CATEGORIES as readonly string[]).includes(input.category)) return { ok: false, error: "Pick a category." }

  const condition = input.condition || "good"
  if (!(CONDITIONS as readonly string[]).includes(condition)) return { ok: false, error: "Pick a condition." }

  const meetSpot = input.meetSpot ?? ""
  if (!(MEET_SPOTS as readonly string[]).includes(meetSpot))
    return { ok: false, error: "Pick a public place to hand it over." }

  const allowRoom = input.allowRoom === true
  if (allowRoom && !me.room)
    return { ok: false, error: "Add your room number on your profile to allow room handovers.", needsProfile: true }

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
          meetSpot,
          allowRoom,
          ownerId: session.user.id,
          status: "AVAILABLE",
        },
        select: { id: true, code: true },
      })
      refresh()
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

  // One statement: only deletes if it is mine AND nobody has it reserved.
  // A separate "check, then delete" would let a reservation land in between,
  // and the cascade would silently wipe that borrower's loan.
  const removed = await prisma.item.deleteMany({
    where: { id: itemId, ownerId: session.user.id, status: { in: ["AVAILABLE", "PAUSED", "LOST"] } },
  })

  if (removed.count === 0) {
    const item = await prisma.item.findUnique({ where: { id: itemId }, select: { ownerId: true } })
    if (!item) return { ok: false, error: "Item not found." }
    if (item.ownerId !== session.user.id) return { ok: false, error: "That isn't your item." }
    return { ok: false, error: "You can't remove an item that is currently out on loan." }
  }
  refresh()
  return { ok: true }
}

/** Away for the weekend, or fixing it? Pause hides it from Browse. */
export async function setPaused(itemId: string, paused: boolean): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const changed = await prisma.item.updateMany({
    where: { id: itemId, ownerId: session.user.id, status: paused ? "AVAILABLE" : "PAUSED" },
    data: paused ? { status: "PAUSED", holdUserId: null, holdUntil: null } : { status: "AVAILABLE" },
  })
  if (changed.count !== 1)
    return { ok: false, error: paused ? "Only an available item can be paused." : "This item isn't paused." }

  if (!paused) await promoteWaitlist(itemId)
  refresh(itemId)
  return { ok: true }
}

/** Busy item? Join the queue; the next one in line gets it held for them. */
export async function joinWaitlist(itemId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }

  const item = await prisma.item.findUnique({ where: { id: itemId }, select: { ownerId: true, status: true } })
  if (!item) return { ok: false, error: "Item not found." }
  if (item.ownerId === session.user.id) return { ok: false, error: "That's your own item." }
  if (item.status === "LOST") return { ok: false, error: "This item was lost." }

  try {
    await prisma.waitlistEntry.create({ data: { itemId, userId: session.user.id } })
  } catch (e) {
    if (!isUniqueViolation(e)) throw e // already on it: fine
  }
  refresh(itemId)
  return { ok: true }
}

export async function leaveWaitlist(itemId: string): Promise<Result> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, error: "Please sign in first." }
  await prisma.waitlistEntry.deleteMany({ where: { itemId, userId: session.user.id } })
  refresh(itemId)
  return { ok: true }
}
