# CampusShare

**Borrow what you need, lend what you don't.** A verified QR-based lending
system for IIIT Dharwad — built for ₹121 as a Frugal Innovation course project.

Live: https://campusshare-black.vercel.app/

---

## The problem

Students buy items they use three or four times a semester — a scientific
calculator for one exam, a lab coat for one lab block, a drafter for Engineering
Graphics. Each costs ₹300–₹2,000 and then sits in a cupboard.

Borrowing today happens by posting in a WhatsApp group. Requests get buried
within minutes, there's no way to see what exists or whether it's free, no record
of who took what, and no reminder to return it. Lenders stop offering because
things come back late or damaged with nobody accountable.

## How it works

1. Each student signs in with their college Google account and sets their hostel once
2. Lender lists an item and picks a public handover spot (and, optionally, their room for same-hostel borrowers)
3. Borrower reserves it and gets a 4-digit **pickup code** — like a food-delivery OTP, only they can see it
4. They meet: same hostel → the lender's room; different hostels → the public spot
5. Lender takes a condition photo and types the borrower's code → the item is now with the borrower
6. At return, the lender reads out their own **return code**; the borrower types it with a second photo
7. Lender compares the two photos and closes the loan — or reports a problem

Nobody can be handed an item, or claim a return, without the other person's code.
Can't find something? Post a **request**; anyone who has one can lend it in one tap.

## Architecture

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | Server Actions mean no separate API server to host or pay for |
| Database | PostgreSQL (Neon) | Relational data with real constraints; free tier |
| ORM | Prisma | Typed queries, and migrations that are reviewable in git |
| Auth | Auth.js v5 + Google | Institute email *is* the identity — see below |
| Styling | Tailwind CSS v4 | No CSS files to maintain |
| Motion | Motion | Landing page only — the app itself stays light |
| Hosting | Vercel | Free, HTTPS by default (which the camera needs) |

## The interesting problem: a reservation race

Two students tap **Reserve** on the same calculator at the same moment. The
obvious code is wrong:

```ts
const item = await db.item.findUnique({ where: { id } })
if (item.status === "AVAILABLE") {     // both requests pass this check
  await db.item.update({ ... })        // both succeed — item promised twice
}
```

Between the read and the write, the second request slips through. The fix is to
move the condition *inside* the write, so the database arbitrates:

```ts
const claimed = await db.item.updateMany({
  where: { id, status: "AVAILABLE" },
  data:  { status: "RESERVED" },
})
if (claimed.count === 0) throw new Error("Someone just reserved this item")
```

One SQL statement, so Postgres serialises it. Exactly one caller gets
`count === 1`. Verified by opening two browser profiles and clicking
simultaneously.

## Trust without money

Students can't take deposits from each other, so accountability has to come from
somewhere else. Two mechanisms:

- **Identity** — sign-in is restricted to `@iiitdwd.ac.in`, so every action in
  the system is attached to a real roll number
- **Evidence** — a condition photo is mandatory at handover *and* at return,
  stored as a pair, so damage is attributable instead of arguable

No deposit, no lock, no sensor.

## Frugal constraints as engineering constraints

| | Cost |
|---|---|
| Total bill of materials | **₹121** of a ₹150 ceiling |
| Printed QR tag | ₹0.60 each |
| An RFID tag doing the same job | ₹30+ |
| Software and hosting | ₹0 — free tiers throughout |

Two decisions came directly from the budget:

- **QR instead of RFID.** A paper sticker read by a camera every student already
  owns, instead of tags plus a reader.
- **No scanner library.** The phone's own camera opens the QR's URL. That removed
  a dependency, a permission prompt, and about 200 KB of JavaScript.

## Running locally

See [START-HERE.md](./START-HERE.md).

## What I'd build next

- Push notifications before the due date (currently in-app only)
- A dispute flow when the two condition photos disagree
- Bulk import so departments can list their existing lab stock
- Object storage for photos — they're base64 in Postgres right now, which is
  fine at pilot scale and wrong beyond a few thousand items

## Known trade-offs

- Condition photos are compressed client-side to ~80 KB and stored as data URLs
  in Postgres. Deliberate: it removed an entire third-party storage dependency
  for the pilot. It does not scale and would be the first thing to change.
- No automated tests. Three-day build; manual test checklist in `BUGS.md`.
