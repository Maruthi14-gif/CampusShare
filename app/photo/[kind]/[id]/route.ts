import { prisma } from "@/lib/prisma"
import { decodePhoto } from "@/lib/photo"

/**
 * Serves a stored photo as a real image file.
 *   /photo/item/<itemId>  — the lender's photo of the item
 *   /photo/log/<logId>    — a handover or return condition photo
 * The ?v= version in the URL changes with the photo, so it is safe to let
 * browsers and Vercel's edge cache each version for a year.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params

  let dataUrl: string | null = null
  if (kind === "item") {
    const item = await prisma.item.findUnique({ where: { id }, select: { imageUrl: true } })
    dataUrl = item?.imageUrl ?? null
  } else if (kind === "log") {
    const log = await prisma.conditionLog.findUnique({ where: { id }, select: { photoUrl: true } })
    dataUrl = log?.photoUrl ?? null
  }

  const photo = dataUrl ? decodePhoto(dataUrl) : null
  if (!photo) return new Response("Not found", { status: 404 })

  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.type,
      "Content-Length": String(photo.bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Vercel's CDN keeps it too, so each photo version leaves the database once.
      "CDN-Cache-Control": "public, max-age=31536000, immutable",
    },
  })
}
