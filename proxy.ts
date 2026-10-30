// proxy.ts  (Next 16 renamed this file from `middleware.ts`)
// Anything matched below requires a signed-in institute account.
export { auth as proxy } from "@/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/items/new"],
}
