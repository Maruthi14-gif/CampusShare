import type { Metadata, Viewport } from "next"
import Link from "next/link"
import { Bricolage_Grotesque } from "next/font/google"
import "./globals.css"
import { auth } from "@/auth"
import { SignOutButton } from "@/components/AuthButtons"

export const metadata: Metadata = {
  title: "CampusShare — borrow what you need, lend what you don't",
  description:
    "A verified QR-based lending system for IIIT Dharwad. Share calculators, lab coats, drafters and books across campus instead of buying them.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "CampusShare", statusBarStyle: "default" },
}

// Display face for big headlines. Self-hosted by Next at build time,
// so there is no request to Google from the student's phone.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
})

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth()

  return (
    <html lang="en" className={`h-full antialiased ${display.variable}`}>
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <nav className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
                CS
              </span>
              <span className="hidden sm:inline">CampusShare</span>
            </Link>

            <div className="ml-auto flex items-center gap-1 text-sm">
              <Link
                href="/items"
                className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100"
              >
                Browse
              </Link>
              {session?.user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-lg px-3 py-2 text-slate-600 transition hover:bg-slate-100"
                  >
                    My stuff
                  </Link>
                  <Link
                    href="/items/new"
                    className="rounded-lg bg-indigo-600 px-3.5 py-2 font-medium text-white transition hover:bg-indigo-700"
                  >
                    Lend an item
                  </Link>
                  <SignOutButton />
                </>
              ) : (
                <Link
                  href="/signin"
                  className="rounded-lg bg-indigo-600 px-3.5 py-2 font-medium text-white transition hover:bg-indigo-700"
                >
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-slate-200 bg-white">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-slate-500">
            CampusShare · Frugal Innovation project · IIIT Dharwad · total build cost ₹121
          </div>
        </footer>
      </body>
    </html>
  )
}
