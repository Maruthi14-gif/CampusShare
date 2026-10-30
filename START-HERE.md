# START HERE

Everything is already in the right folder. You do **not** need to create any
folders or move any files.

---

## Step 1 · Put this folder where you keep your projects

Move the `campusshare` folder to your Desktop (or anywhere you like).

## Step 2 · Open a terminal inside it

**Windows** — open the `campusshare` folder in File Explorer, click the address
bar at the top, type `cmd`, press Enter.

**Mac** — open Terminal and type `cd ` (with a space), then drag the
`campusshare` folder onto the Terminal window and press Enter.

**Or, easiest:** open the folder in VS Code, then press `` Ctrl + ` `` to open a
terminal that is already in the right place.

Check you're in the right folder — this should print a long list ending in
`package.json`:

```bash
ls        # Windows: dir
```

## Step 3 · Install

```bash
npm install
```

Takes 1–2 minutes. It will print some warnings — that's normal.

> If it fails with `ERESOLVE`, run `npm install --legacy-peer-deps` instead.

## Step 4 · Get a database (5 min)

1. Go to **neon.tech**, sign up with GitHub, create a project
2. Copy the connection string it shows you
3. In this folder, copy `.env.example` to a new file called `.env.local`
4. Paste the connection string into both `DATABASE_URL` and `DIRECT_URL`

Then create the tables:

```bash
npx prisma generate
npx prisma db push
node prisma/seed.mjs       # adds 8 demo items so the app isn't empty
```

## Step 5 · Get Google sign-in working (15 min)

Generate your auth secret:

```bash
npx auth secret
```

Then go to **console.cloud.google.com**:

1. Create a new project (any name)
2. *APIs & Services* → *OAuth consent screen* → External → fill the required fields
3. *Credentials* → *Create credentials* → *OAuth client ID* → **Web application**
4. Under **Authorised redirect URIs**, add both of these now:
   ```
   http://localhost:3000/api/auth/callback/google
   https://YOUR-APP.vercel.app/api/auth/callback/google
   ```
   (Guess your Vercel name — you can edit it later.)
5. Copy the Client ID and Client Secret into `.env.local` as `AUTH_GOOGLE_ID`
   and `AUTH_GOOGLE_SECRET`

## Step 6 · Run it

```bash
npm run dev
```

Open **http://localhost:3000**

Sign in with your `@iiitdwd.ac.in` account. **Then try signing in with a personal
Gmail account — it must be refused.** Screenshot that refusal; it's proof your
verification layer works and it belongs in your presentation.

## Step 7 · Push to GitHub

```bash
git init
git add .
git commit -m "feat: CampusShare — lending flow, auth, QR tags"
git branch -M main
git remote add origin https://github.com/Maruthi14-gif/CampusShare.git
git push -u origin main
```

If GitHub rejects it because the repo already has a README:

```bash
git pull origin main --allow-unrelated-histories
git push -u origin main
```

## Step 8 · Deploy (10 min)

1. **vercel.com** → *Add New Project* → import `CampusShare`
2. Add every variable from `.env.local` into Vercel's Environment Variables
3. Add two more:
   - `AUTH_URL` = your Vercel URL, e.g. `https://campusshare.vercel.app`
   - `NEXT_PUBLIC_APP_URL` = the same URL (so printed QR codes point at the live site)
4. Deploy
5. Go back to the Google console and make sure the real Vercel URL is in the
   redirect URIs

Open the live URL on your **phone**. Add it to your home screen — it installs
like an app.

---

## What's already built

| Page | What it does |
|---|---|
| `/` | Landing page with animations and the ₹121 cost story |
| `/signin` | Google sign-in, locked to `@iiitdwd.ac.in` |
| `/items` | Browse and search, filter by category |
| `/items/new` | List an item with a photo, get a printable QR tag |
| `/items/[id]` | Item detail, reserve, the whole handover flow, condition photos |
| `/dashboard` | What you're lending, what you're borrowing, what needs your action |
| `/t/[code]` | Where a scanned QR tag lands — redirects to the item |

The complete custody flow works:
**AVAILABLE → RESERVED → ISSUED → COLLECTED → RETURNED → VERIFIED → AVAILABLE**

---

## Where things live (you don't need to change this)

```
campusshare/
├── app/
│   ├── actions/        ← server logic: items.ts, loans.ts  ← the important one
│   ├── items/          ← browse, new, detail pages
│   ├── dashboard/      ← your stuff
│   ├── signin/
│   ├── t/[code]/       ← QR tags land here
│   ├── layout.tsx      ← header and footer, wraps every page
│   └── page.tsx        ← landing page
├── components/         ← reusable UI pieces
├── lib/                ← prisma client, helpers, QR generation
├── prisma/
│   ├── schema.prisma   ← the database shape
│   └── seed.mjs        ← demo data
├── auth.ts             ← Google sign-in + the @iiitdwd.ac.in gate
├── proxy.ts            ← which pages require login
└── .env.local          ← your secrets (never commit this)
```

---

## If something breaks

| Symptom | Fix |
|---|---|
| `Cannot find module '@prisma/client'` | Run `npx prisma generate` |
| `Environment variable not found: DATABASE_URL` | `.env.local` is missing or misspelled |
| Sign-in loops or says `redirect_uri_mismatch` | The URL isn't in Google's redirect URIs — must match exactly |
| Page shows no items | Run `node prisma/seed.mjs` |
| Works locally, fails on Vercel | Vercel → Deployments → Logs. Usually a missing env variable |
| Want to see the database | `npx prisma studio` |

Copy the **whole** error message when asking for help — the first line alone is
usually not the useful part.

---

## Before you present

1. Run the full flow twice from a fresh account
2. Test the race condition: two browser windows, two accounts, click Reserve at
   the same moment. One wins, one gets a clean error. **Screenshot both.**
3. Record a 3-minute screen capture of the working flow as a backup
4. Print 6 QR tags and stick them on real items in the box
