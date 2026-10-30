/**
 * Demo data so the app isn't empty during the presentation.
 *
 *   node prisma/seed.mjs
 *
 * Creates one demo lender and eight realistic items. Safe to run twice —
 * it skips anything that already exists.
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const DEMO_EMAIL = "demo.lender@iiitdwd.ac.in"

const ITEMS = [
  { code: "CS-1001", title: "Casio FX-991EX calculator", category: "Calculator", condition: "good", slot: "S1", description: "Allowed in exams. Cover included." },
  { code: "CS-1002", title: "White lab coat (size M)", category: "Lab coat", condition: "good", slot: "S2", description: "Washed. Two chest pockets." },
  { code: "CS-1003", title: "Mini drafter set", category: "Drafter / drawing kit", condition: "fair", slot: "S3", description: "Used for one Engineering Graphics course." },
  { code: "CS-1004", title: "Engineering Mechanics (Timoshenko)", category: "Book", condition: "fair", slot: "S4", description: "Some highlighting in chapters 3–5." },
  { code: "CS-1005", title: "Digital multimeter", category: "Lab equipment", condition: "good", slot: "S5", description: "Probes included. Needs a 9V battery." },
  { code: "CS-1006", title: "4-socket extension board", category: "Charger / cable", condition: "good", slot: "S6", description: "ISI marked, 2 m cable." },
  { code: "CS-1007", title: "Badminton racket", category: "Sports", condition: "worn", description: "Grip is worn but strings are fine." },
  { code: "CS-1008", title: "65W USB-C laptop charger", category: "Charger / cable", condition: "good", description: "Works with most modern laptops." },
]

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      name: "Demo Lender",
      rollNo: "DEMO.LENDER",
    },
  })

  let created = 0
  for (const item of ITEMS) {
    const exists = await prisma.item.findUnique({ where: { code: item.code } })
    if (exists) continue
    await prisma.item.create({ data: { ...item, ownerId: owner.id, status: "AVAILABLE" } })
    created++
  }

  console.log(`Seeded ${created} item(s). Demo lender: ${DEMO_EMAIL}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
