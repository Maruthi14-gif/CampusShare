# Bug log

One line per bug: what broke, what caused it, how it was fixed.
These become the "what was hardest" answers in a viva or interview.

| # | What broke | Cause | Fix |
|---|---|---|---|
| 1 | `npm install` failed with ERESOLVE | `next-auth@5.0.0-beta.25` only supports Next ≤15; the scaffold is Next 16 | Pinned `next-auth@5.0.0-beta.32`, the first beta that declares Next 16 support |
| 2 | Build failed: *Server Actions must be async functions* | `isOverdue()` was a plain sync helper exported from a `"use server"` file — every export there must be an async action | Moved it to `lib/utils.ts` |
| 3 | Build failed: *Route segment config "dynamic" is not compatible with `cacheComponents`* | Next 16 enables `cacheComponents` by default, which forbids `export const dynamic` | Set `cacheComponents: false` — every page reads live data anyway |
| 4 | Auth route exported nothing usable | Wrote `export { GET, POST } from "@/auth"`, but Auth.js v5 exports a `handlers` object | `import { handlers }` then `export const { GET, POST } = handlers` |
| 5 | Deprecation warning on every build | Next 16 renamed `middleware.ts` to `proxy.ts` | Renamed the file, export `auth as proxy` |

<!-- Add your own below as you hit them. Takes 30 seconds, worth a lot later. -->

| # | What broke | Cause | Fix |
|---|---|---|---|
| 6 | Owner taps "Mark as issued" while borrower taps "Cancel": loan ends CANCELLED, item AVAILABLE, but the item is physically in the slot. A double-tap also saved two handover photos | Every step after Reserve read the status, then wrote it in a separate query. Same check-then-act race that Reserve already avoided | All steps go through one `transition()` helper: `updateMany` with the expected status in the WHERE, plus the item update and photo, in one transaction. Loser gets a clean error |
| 7 | Reserve could leave an item RESERVED with no loan if the server died between the two writes | Item claim and loan insert were separate statements, with a manual undo in `catch` | Both run in one interactive transaction |
| 8 | Two students listing at once could get the same CS-xxxx code and one would crash | Code picked by "look up, then insert" | Insert directly and retry on Postgres unique violation (P2002) |
| 9 | Deleting an item at the moment someone reserved it silently wiped their loan (cascade) | Check status, then delete | Single `deleteMany` where status is AVAILABLE and owner is me |
| 10 | Signed-out visitors could open "Lend an item", fill it all in, then get "Please sign in" | `auth` as proxy only redirects if an `authorized` callback exists | Added `authorized` callback, plus a redirect in the page itself |
| 11 | After signing in from a scanned QR, the student landed on Browse, not the item | Sign-in page ignored `callbackUrl` | Sign-in honours `callbackUrl`, restricted to paths on this site |
| 12 | Server accepted any loan length, category, slot, or "photo" string from a crafted request | Only the browser form validated input | Server checks all fields; photos must be JPEG/PNG/WebP data URLs under ~500 KB |

---

## Manual test checklist (run before presenting)

- [ ] Sign in with an `@iiitdwd.ac.in` account — works
- [ ] Sign in with a personal Gmail — **refused** (screenshot this)
- [ ] List an item with a photo — QR tag appears
- [ ] Scan that QR with a phone camera — opens the item page
- [ ] Reserve from a second account — pickup code shown
- [ ] Two accounts reserve simultaneously — one wins, one sees a clean error
- [ ] Fill in hostel on the profile page; borrowing without it is refused
- [ ] Same hostel + room allowed: meeting place shows the lender's room. Different hostel: the public spot
- [ ] Borrower sees the pickup code, lender does NOT. Lender types it + photo → "with borrower"
- [ ] A wrong code is refused; 5 wrong codes issue a fresh one
- [ ] Lender sees the return code, borrower does NOT. Borrower types it + photo → "returned"
- [ ] Owner closes the loan as fine, or reports a problem (item pauses)
- [ ] Ask for more days → owner approves → due date moves
- [ ] Reservation not handed over in 24h cancels itself
- [ ] Waitlist: item comes back held for #1 in line
- [ ] Requests: post one, another student lends in one tap; WhatsApp share works
- [ ] Third active borrow is refused; 2 late returns pause borrowing
- [ ] Both condition photos show side by side
- [ ] Item returns to AVAILABLE at the end
- [ ] Overdue badge appears (set `dueAt` to the past in Prisma Studio to test)
- [ ] Everything works on a phone, not just the laptop
- [ ] App installs to the phone home screen
