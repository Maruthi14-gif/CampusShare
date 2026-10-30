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
| 6 |  |  |  |

---

## Manual test checklist (run before presenting)

- [ ] Sign in with an `@iiitdwd.ac.in` account — works
- [ ] Sign in with a personal Gmail — **refused** (screenshot this)
- [ ] List an item with a photo — QR tag appears
- [ ] Scan that QR with a phone camera — opens the item page
- [ ] Reserve from a second account — pickup code shown
- [ ] Two accounts reserve simultaneously — one wins, one sees a clean error
- [ ] Issue with a photo → collect → return with a photo → verify
- [ ] Both condition photos show side by side
- [ ] Item returns to AVAILABLE at the end
- [ ] Overdue badge appears (set `dueAt` to the past in Prisma Studio to test)
- [ ] Everything works on a phone, not just the laptop
- [ ] App installs to the phone home screen
