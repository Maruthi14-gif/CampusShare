import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { itemQrDataUrl, baseUrl } from "@/lib/qr"
import { formatDate } from "@/lib/utils"
import { Badge, Card, StatusBadge } from "@/components/ui"
import {
  CancelButton,
  CollectButton,
  IssueForm,
  ReserveButton,
  ReturnForm,
  VerifyButton,
} from "@/components/LoanActions"

export const dynamic = "force-dynamic"

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const { id } = await params
  const { new: isNew } = await searchParams
  const session = await auth()

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, rollNo: true } },
      loans: {
        where: { status: { in: ["RESERVED", "ISSUED", "COLLECTED", "RETURNED"] } },
        include: {
          borrower: { select: { id: true, name: true, rollNo: true } },
          logs: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!item) notFound()

  const me = session?.user?.id
  const isOwner = me === item.owner.id
  const loan = item.loans[0] ?? null
  const isBorrower = loan && me === loan.borrower.id
  const qr = await itemQrDataUrl(item.code, baseUrl())

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link href="/items" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to browse
      </Link>

      {isNew && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Listed. Print the tag below, stick it on the item, and drop it in your slot.
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* ── left: the item ── */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="aspect-[16/10] w-full bg-slate-100">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-400">
                  no photo
                </div>
              )}
            </div>
            <div className="space-y-3 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="blue">{item.category}</Badge>
                <Badge>{item.code}</Badge>
                <Badge tone={item.condition === "good" ? "green" : "amber"}>
                  {item.condition}
                </Badge>
                {item.slot && <Badge tone="amber">Slot {item.slot}</Badge>}
              </div>
              {item.description && (
                <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>
              )}
              <p className="text-sm text-slate-500">
                Lent by {item.owner.name ?? "a student"}
                {/* Roll numbers are for campus eyes only, not the open web */}
                {session?.user && item.owner.rollNo && ` · ${item.owner.rollNo}`}
              </p>
            </div>
          </Card>

          {/* condition photo trail */}
          {loan && loan.logs.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-slate-900">Condition record</h2>
              <p className="mt-1 text-xs text-slate-500">
                Before and after, so damage is attributable instead of arguable.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {loan.logs.map((log) => (
                  <figure key={log.id} className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={log.photoUrl}
                      alt=""
                      className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-slate-200"
                    />
                    <figcaption className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">
                        {log.phase === "ISSUE" ? "At handover" : "On return"}
                      </span>{" "}
                      · {formatDate(log.createdAt)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── right: actions + tag ── */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-900">
              {loan ? "Current loan" : "Availability"}
            </h2>

            {!session?.user && (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-600">
                  Sign in with your institute account to borrow this.
                </p>
                <Link
                  href={`/signin?callbackUrl=${encodeURIComponent(`/items/${item.id}`)}`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-indigo-600 text-sm font-medium text-white"
                >
                  Sign in
                </Link>
              </div>
            )}

            {session?.user && !loan && item.status === "AVAILABLE" && !isOwner && (
              <div className="mt-4">
                <ReserveButton itemId={item.id} />
              </div>
            )}

            {session?.user && !loan && isOwner && (
              <p className="mt-4 text-sm text-slate-600">
                This is your item. It&apos;s available for others to reserve.
              </p>
            )}

            {loan && (
              <div className="mt-4 space-y-4">
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Status</dt>
                    <dd>
                      <StatusBadge status={loan.status} />
                    </dd>
                  </div>
                  {session?.user && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Borrower</dt>
                      <dd className="font-medium">
                        {loan.borrower.name ?? loan.borrower.rollNo}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Due</dt>
                    <dd className="font-medium">{formatDate(loan.dueAt)}</dd>
                  </div>
                  {(isOwner || isBorrower) && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Pickup code</dt>
                      <dd className="font-mono font-semibold tracking-widest">
                        {loan.pickupCode}
                      </dd>
                    </div>
                  )}
                </dl>

                <div className="border-t border-slate-200 pt-4">
                  {isOwner && loan.status === "RESERVED" && <IssueForm loanId={loan.id} />}
                  {isBorrower && loan.status === "ISSUED" && (
                    <CollectButton loanId={loan.id} />
                  )}
                  {isBorrower && loan.status === "COLLECTED" && (
                    <ReturnForm loanId={loan.id} />
                  )}
                  {isOwner && loan.status === "RETURNED" && (
                    <VerifyButton loanId={loan.id} />
                  )}
                  {(isOwner || isBorrower) && loan.status === "RESERVED" && (
                    <div className="mt-2">
                      <CancelButton loanId={loan.id} />
                    </div>
                  )}
                  {!isOwner && !isBorrower && (
                    <p className="text-sm text-slate-600">
                      This item is currently out on loan.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>

          {/* printable tag */}
          <Card className="p-6 text-center">
            <h2 className="text-sm font-semibold text-slate-900">Printable tag</h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt={`QR code for ${item.code}`} className="mx-auto mt-4 h-44 w-44" />
            <p className="mt-2 font-mono text-lg font-semibold tracking-widest">{item.code}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Print at 3.5 × 2.5 cm, cover with clear tape, stick on the item. The code is
              printed in text too, so a scuffed tag still works.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
