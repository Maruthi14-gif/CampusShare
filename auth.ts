// ─────────────────────────────────────────────────────────────
//  auth.ts   (put this at the PROJECT ROOT, next to package.json)
//
//  This file is your "verification layer" from the diagram.
//  Only @iiitdwd.ac.in accounts get in. Test it with a Gmail
//  account too — that one must be REFUSED. Screenshot the refusal.
// ─────────────────────────────────────────────────────────────

import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"

const ALLOWED_DOMAIN = process.env.ALLOWED_EMAIL_DOMAIN ?? "iiitdwd.ac.in"

// Roll number is the part of the institute email before the @ ("24bcs098")
function rollNoFromEmail(email: string) {
  return email.split("@")[0].toUpperCase()
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/signin" },

  callbacks: {
    // ── the gate ──
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase()
      if (!email) return false
      return email.endsWith(`@${ALLOWED_DOMAIN}`)
    },

    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id
      return token
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
        if (session.user.email) {
          session.user.rollNo = rollNoFromEmail(session.user.email)
        }
      }
      return session
    },
  },

  events: {
    // Save the roll number on first sign-in so it is queryable
    async createUser({ user }) {
      if (user.email) {
        await prisma.user.update({
          where: { id: user.id },
          data: { rollNo: rollNoFromEmail(user.email) },
        })
      }
    },
  },
})
