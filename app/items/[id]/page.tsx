import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { findStockImage } from "@/lib/stockImage"
import { photoSrc } from "@/lib/photo"
import { formatDate, nowMs } from "@/lib/utils"
import { RULES, whatsappLink } from "@/lib/campus"
import { runHousekeeping, trustStats } from "@/lib/rules"
import { karmaFor } from "@/lib/karma"
import { LevelBadge } from "@/components/Karma"
import { Badge, Card, StatusBadge } from "@/components/ui"
import {
  CancelButton,
  CloseLoanForm,
  CodeDigits,
  EarlyReturnButton,
  ExtensionAnswer,
  ExtensionAsk,
  HandoverForm,
  LostButton,
  PauseToggle,
  ReportStudent,
  ReserveButton,
  ReturnForm,
  WaitlistButton,
} from "@/components/LoanActions"

export const dynamic = "force-dynamic"

const DAY = 86_400_000

export default async function ItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ new?: string; requestFailed?: string }>
}) {
  const { id } = await params
  const { new: isNew, requestFailed } = await searchParams
  await runHousekeeping()
  const session = await auth()
  const me = session?.user?.id ?? null

  const item = await prisma.item.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, rollNo: true, phone: true } },
      loans: {
        where: { status: { in: ["RESERVED", "ISSUED", "COLLECTED", "RETURNED"] } },
        include: {
          borrower: { select: { id: true, name: true, rollNo: true, phone: true } },
          logs: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      waitlist: { select: { userId: true }, orderBy: { createdAt: "asc" } },
    },
  })
  if (!item) notFound()

  const isOwner = me === item.owner.id
  const loan = item.loans[0] ?? null
  const isBorrower = !!loan && me === loan.borrower.id
  const isParty = isOwner || isBorrower
  const ownerFirst = item.owner.name?.split(" ")[0] ?? "the owner"
  const borrowerFirst = loan?.borrower.name?.split(" ")[0] ?? "the borrower"

  const waitPos = me ? item.waitlist.findIndex((w) => w.userId === me) : -1
  const heldActive = !!item.holdUserId && !!item.holdUntil && item.holdUntil > new Date()
  const heldForMe = heldActive && item.holdUserId === me
  const overdueDays = loan ? Math.floor((nowMs() - loan.dueAt.getTime()) / DAY) : 0

  const [stock, ownerStats, borrowerStats] = await Promise.all([
    item.imageUrl ? null : findStockImage(item.title, item.category),
    session?.user ? karmaFor(item.owner.id) : null,
    loan && isOwner ? trustStats(loan.borrower.id) : null,
  ])

  // The other person's WhatsApp, only inside an active loan.
  const contact = !loan
    ? null
    : isBorrower
      ? whatsappLink(item.owner.phone, `Hi ${ownerFirst}, about your ${item.title} on CampusShare`)
      : isOwner
        ? whatsappLink(loan.borrower.phone, `Hi ${borrowerFirst}, about my ${item.title} on CampusShare`)
        : null

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Link href="/items" className="text-sm text-slate-500 hover:text-slate-700">
        ← Back to browse
      </Link>

      {isNew && (
        <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          Listed. Students can find it on Browse now.
          {loan && isOwner && ` It's reserved for ${borrowerFirst} — hand it over at ${loan.meetPlace}.`}
        </p>
      )}
      {requestFailed && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
          Your item is listed, but it couldn&apos;t be lent to the requester: {requestFailed}
        </p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* ── left: the item ── */}
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="aspect-[16/10] w-full bg-slate-100">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoSrc("item", item.id, item.imageUrl)!} alt={item.title} className="h-full w-full object-cover" fetchPriority="high" />
              ) : stock ? (
                <figure className="relative h-full w-full">
                  <Image
                    src={stock.url}
                    alt={`Stock photo of a ${item.category.toLowerCase()}`}
                    fill
                    priority
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="object-cover"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-[11px] leading-snug text-white/90">
                    <strong className="font-semibold text-white">Stock photo, not the actual item.</strong> Photo:{" "}
                    {stock.author},{" "}
                    <a href={stock.sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                      {stock.license}, via Wikimedia Commons
                    </a>
                  </figcaption>
                </figure>
              ) : (
                <div className="grid h-full place-items-center text-sm text-slate-500">no photo</div>
              )}
            </div>
            <div className="space-y-3 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h1 className="font-display text-2xl font-bold tracking-[-0.02em] text-ink">{item.title}</h1>
                <StatusBadge status={item.status} />
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge tone="blue">{item.category}</Badge>
                <Badge>{item.code}</Badge>
                <Badge tone={item.condition === "good" ? "green" : "amber"}>{item.condition}</Badge>
                <Badge tone="blue">
                  Lent for {item.loanDays} day{item.loanDays === 1 ? "" : "s"}
                </Badge>
                <Badge tone="amber">Handover: {item.meetSpot}</Badge>
                {item.allowRoom && <Badge tone="green">Room pickup for same hostel</Badge>}
              </div>
              {item.description && <p className="text-sm leading-relaxed text-slate-600">{item.description}</p>}
              <p className="text-sm text-slate-500">
                Lent by {item.owner.name ?? "a student"}
                {/* Roll numbers are for campus eyes only, not the open web */}
                {session?.user && item.owner.rollNo && ` · ${item.owner.rollNo}`}
                {ownerStats && ownerStats.lent > 0 && ` · lent ${ownerStats.lent} time${ownerStats.lent === 1 ? "" : "s"}`}
                {ownerStats && ownerStats.level !== "Newcomer" && <LevelBadge level={ownerStats.level} className="ml-2 align-middle" />}
              </p>
            </div>
          </Card>

          {/* condition photo trail */}
          {loan && loan.logs.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-semibold text-slate-900">Condition record</h2>
              <p className="mt-1 text-xs text-slate-500">Before and after, so damage is attributable instead of arguable.</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {loan.logs.map((log) => (
                  <figure key={log.id} className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc("log", log.id, log.photoUrl)!} alt={log.phase === "ISSUE" ? "Condition at handover" : "Condition on return"} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-xl object-cover ring-1 ring-slate-200" />
                    <figcaption className="text-xs text-slate-500">
                      <span className="font-medium text-slate-700">{log.phase === "ISSUE" ? "At handover" : "On return"}</span> ·{" "}
                      {formatDate(log.createdAt)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* ── right: what to do next ── */}
        <div className="space-y-6">
          <Card className="space-y-4 p-6">
            <h2 className="text-sm font-semibold text-slate-900">{loan ? "Current loan" : "Availability"}</h2>

            {!session?.user ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Sign in with your institute account to borrow this.</p>
                <Link
                  href={`/signin?callbackUrl=${encodeURIComponent(`/items/${item.id}`)}`}
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-ink text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Sign in
                </Link>
              </div>
            ) : item.status === "LOST" ? (
              <p className="text-sm text-slate-600">This item was marked as lost.</p>
            ) : item.status === "PAUSED" ? (
              isOwner ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">Paused. Nobody can reserve it until you relist it.</p>
                  <PauseToggle itemId={item.id} paused />
                </div>
              ) : (
                <p className="text-sm text-slate-600">The owner has paused lending for now.</p>
              )
            ) : !loan ? (
              /* ── free (or awaiting check with no open loan) ── */
              isOwner ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    This is your item. It&apos;s available for others to reserve.
                    {item.waitlist.length > 0 && ` ${item.waitlist.length} waiting.`}
                    {heldActive && ` Held for the next student on the waitlist until ${formatDate(item.holdUntil!)}.`}
                  </p>
                  <PauseToggle itemId={item.id} paused={false} />
                </div>
              ) : heldActive && !heldForMe ? (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    Held for the next student on the waitlist until {formatDate(item.holdUntil!)}.
                  </p>
                  <WaitlistButton itemId={item.id} joined={waitPos >= 0} position={waitPos >= 0 ? waitPos + 1 : null} />
                </div>
              ) : item.status === "AVAILABLE" ? (
                <ReserveButton itemId={item.id} days={item.loanDays} held={heldForMe} />
              ) : (
                <WaitlistButton itemId={item.id} joined={waitPos >= 0} position={waitPos >= 0 ? waitPos + 1 : null} />
              )
            ) : (
              /* ── there is an open loan ── */
              <div className="space-y-4">
                <dl className="space-y-1.5 text-sm">
                  <Row label="Status">
                    <StatusBadge status={loan.status} />
                  </Row>
                  <Row label="Borrower">
                    {loan.borrower.name ?? loan.borrower.rollNo}
                    {borrowerStats && (
                      <span className="block text-right text-xs font-normal text-slate-500">
                        borrowed {borrowerStats.borrowed} · late {borrowerStats.late}
                      </span>
                    )}
                  </Row>
                  <Row label="Due">
                    {formatDate(loan.dueAt)}
                    {overdueDays > 0 && loan.status !== "RETURNED" && (
                      <span className="ml-1 text-rose-600">({overdueDays}d overdue)</span>
                    )}
                  </Row>
                  {isParty && <Row label="Meet at">{loan.meetPlace ?? "Agree with each other"}</Row>}
                </dl>

                {contact && (
                  <a
                    href={contact}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-medium text-white"
                  >
                    WhatsApp {isBorrower ? ownerFirst : borrowerFirst}
                  </a>
                )}

                <div className="space-y-4 border-t border-slate-200 pt-4">
                  {/* RESERVED */}
                  {isBorrower && loan.status === "RESERVED" && (
                    <>
                      <CodeDigits code={loan.pickupCode} label={`Your pickup code — tell it to ${ownerFirst}`} />
                      <p className="text-sm text-slate-600">
                        Meet {ownerFirst} at <strong>{loan.meetPlace}</strong>. Only say the code once you have the item in
                        your hands. Not handed over by{" "}
                        {formatDate(new Date(loan.createdAt.getTime() + RULES.reserveHoldHours * 3_600_000))}? It cancels
                        itself.
                      </p>
                      <CancelButton loanId={loan.id} />
                    </>
                  )}
                  {isOwner && loan.status === "RESERVED" && (
                    <>
                      <HandoverForm loanId={loan.id} borrowerName={borrowerFirst} />
                      <CancelButton loanId={loan.id} />
                    </>
                  )}

                  {/* WITH THE BORROWER */}
                  {isBorrower && (loan.status === "ISSUED" || loan.status === "COLLECTED") && (
                    <>
                      {loan.returnRequestedAt && (
                        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                          {ownerFirst} needs it back early. Please return it as soon as you can.
                        </p>
                      )}
                      <ReturnForm loanId={loan.id} ownerName={ownerFirst} />
                      {loan.extendDays ? (
                        <p className="text-sm text-slate-600">
                          You asked for {loan.extendDays} more day{loan.extendDays === 1 ? "" : "s"}. Waiting for {ownerFirst}.
                        </p>
                      ) : (
                        <ExtensionAsk loanId={loan.id} maxDays={RULES.maxExtendDays} />
                      )}
                      <LostButton loanId={loan.id} byOwner={false} />
                    </>
                  )}
                  {isOwner && (loan.status === "ISSUED" || loan.status === "COLLECTED") && (
                    <>
                      <CodeDigits code={loan.returnCode} label={`Return code — tell it to ${borrowerFirst} when you get it back`} />
                      {loan.extendDays ? (
                        <ExtensionAnswer loanId={loan.id} days={loan.extendDays} who={borrowerFirst} />
                      ) : null}
                      {loan.returnRequestedAt ? (
                        <p className="text-sm text-slate-600">You asked for it back on {formatDate(loan.returnRequestedAt)}.</p>
                      ) : (
                        <EarlyReturnButton loanId={loan.id} />
                      )}
                      {overdueDays >= RULES.lostAfterOverdueDays && <LostButton loanId={loan.id} byOwner />}
                    </>
                  )}

                  {/* RETURNED, waiting for the owner's check */}
                  {isOwner && loan.status === "RETURNED" && (
                    <>
                      <p className="text-sm text-slate-600">Compare the two photos, then close the loan.</p>
                      <CloseLoanForm loanId={loan.id} />
                    </>
                  )}
                  {isBorrower && loan.status === "RETURNED" && (
                    <p className="text-sm text-slate-600">Returned. {ownerFirst} is checking the condition.</p>
                  )}

                  {/* everyone else */}
                  {!isParty && (
                    <>
                      <p className="text-sm text-slate-600">This item is out on loan right now.</p>
                      <WaitlistButton itemId={item.id} joined={waitPos >= 0} position={waitPos >= 0 ? waitPos + 1 : null} />
                    </>
                  )}

                  {isParty && <ReportStudent loanId={loan.id} who={isBorrower ? ownerFirst : borrowerFirst} />}
                </div>
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  )
}
