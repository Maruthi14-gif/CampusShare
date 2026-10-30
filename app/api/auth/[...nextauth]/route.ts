// app/api/auth/[...nextauth]/route.ts
// Auth.js v5 exposes a `handlers` object; Next needs named GET/POST exports.
import { handlers } from "@/auth"

export const { GET, POST } = handlers
