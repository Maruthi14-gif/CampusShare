// ─────────────────────────────────────────────────────────────
//  lib/prisma.ts
//  One shared Prisma client. Without this, Next.js hot-reload
//  opens a new DB connection on every save and Neon cuts you off.
// ─────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
