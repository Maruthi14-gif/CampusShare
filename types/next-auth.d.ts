// types/next-auth.d.ts
// Teaches TypeScript that session.user has .id and .rollNo
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      rollNo?: string
    } & DefaultSession["user"]
  }
}
