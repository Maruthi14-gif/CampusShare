import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque } from "next/font/google"
import "./globals.css"
import { auth } from "@/auth"
import { Navbar } from "@/components/Navbar"
import { Footer } from "@/components/Footer"

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
        <Navbar
          user={
            session?.user
              ? {
                  name: session.user.name ?? null,
                  email: session.user.email ?? null,
                  image: session.user.image ?? null,
                  rollNo: session.user.rollNo ?? null,
                }
              : null
          }
        />

        {/* The navbar floats over the top of each page, so pull content up under it */}
        <main className="-mt-[4.25rem] flex-1 pt-[4.25rem]">{children}</main>

        <Footer />
      </body>
    </html>
  )
}
