import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

/**
 * Every printed QR points here: /t/CS-0147
 *
 * No scanner library is needed anywhere in this app — the phone's own
 * camera reads the QR and opens this URL. One less dependency, one less
 * permission prompt, and it works on every phone already.
 */
export default async function TagPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params

  const item = await prisma.item.findUnique({
    where: { code: decodeURIComponent(code).toUpperCase() },
    select: { id: true },
  })

  if (!item) notFound()
  redirect(`/items/${item.id}`)
}
