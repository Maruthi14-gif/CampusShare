"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { signOut } from "next-auth/react"
import {
  AnimatePresence,
  MotionConfig,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react"
import { cn } from "@/lib/utils"

export type NavUser = {
  name: string | null
  email: string | null
  image: string | null
  rollNo: string | null
}

type NavLink = { href: string; label: string; match: (p: string) => boolean }

const EASE = [0.22, 1, 0.36, 1] as const

export function Navbar({ user }: { user: NavUser | null }) {
  const pathname = usePathname()
  const [hidden, setHidden] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  // Hide when scrolling down, show again on the slightest scroll up.
  const { scrollY } = useScroll()
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0
    setScrolled(y > 8)
    if (menuOpen) return
    setHidden(y > prev && y > 240)
  })

  // Close the phone menu whenever the page changes.
  const [lastPath, setLastPath] = useState(pathname)
  if (pathname !== lastPath) {
    setLastPath(pathname)
    setMenuOpen(false)
  }

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false)
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [menuOpen])

  const links: NavLink[] = [
    { href: "/items", label: "Browse", match: (p) => p === "/items" || (p.startsWith("/items/") && p !== "/items/new") },
    { href: "/requests", label: "Requests", match: (p) => p.startsWith("/requests") },
    ...(user
      ? [{ href: "/dashboard", label: "My stuff", match: (p: string) => p.startsWith("/dashboard") }]
      : [{ href: "/#how", label: "How it works", match: () => false }]),
  ]

  return (
    <MotionConfig reducedMotion="user">
      <motion.header
        animate={{ y: hidden ? "-120%" : "0%" }}
        transition={{ duration: 0.35, ease: EASE }}
        className="sticky top-0 z-50 px-3 pt-3 sm:px-4"
      >
        <nav
          aria-label="Main"
          className={cn(
            "mx-auto flex h-14 w-full max-w-6xl items-center gap-2 rounded-2xl pl-2.5 pr-2 transition-all duration-300",
            "bg-white/70 ring-1 ring-slate-900/5 backdrop-blur-xl backdrop-saturate-150",
            scrolled || menuOpen ? "shadow-[0_8px_30px_-12px_rgb(30_27_75/0.25)]" : "shadow-sm"
          )}
        >
          <Logo />

          {/* ── desktop links, with a highlight that glides between them ── */}
          <ul className="ml-4 hidden items-center gap-1 md:flex">
            {links.map((l) => {
              const active = l.match(pathname)
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-xl px-3.5 py-2 text-sm font-medium transition-colors",
                      active ? "text-slate-950" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                        className="absolute inset-0 -z-10 rounded-xl bg-slate-900/[0.06]"
                      />
                    )}
                    {l.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            <LendButton className="hidden sm:inline-flex" />
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <Link
                href="/signin"
                className="hidden h-10 items-center rounded-xl px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-900/5 md:inline-flex"
              >
                Sign in
              </Link>
            )}
            <MenuToggle open={menuOpen} onClick={() => setMenuOpen((o) => !o)} />
          </div>
        </nav>

        {/* ── phone menu ── */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="mx-auto mt-2 w-full max-w-6xl origin-top overflow-hidden rounded-2xl bg-white/90 p-2 shadow-xl ring-1 ring-slate-900/5 backdrop-blur-xl md:hidden"
            >
              <ul>
                {[...links, ...(user ? [] : [{ href: "/signin", label: "Sign in", match: (p: string) => p === "/signin" }])].map(
                  (l, i) => (
                    <motion.li
                      key={l.href}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.04 + i * 0.05, duration: 0.25 }}
                    >
                      <Link
                        href={l.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-4 py-3.5 font-display text-xl font-semibold tracking-tight",
                          l.match(pathname) ? "bg-slate-900/5 text-slate-950" : "text-slate-700"
                        )}
                      >
                        {l.label}
                        <span className="text-slate-300">→</span>
                      </Link>
                    </motion.li>
                  )
                )}
              </ul>
              <div className="p-2 pt-3 sm:hidden">
                <LendButton className="flex h-12 w-full justify-center" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>
    </MotionConfig>
  )
}

function Logo() {
  return (
    <Link href="/" className="group flex items-center gap-2.5 rounded-xl pr-2 font-semibold tracking-tight">
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-[13px] font-bold text-white shadow-md shadow-indigo-600/30">
        <span className="absolute inset-0 bg-gradient-to-t from-transparent to-white/25" />
        <span className="relative transition-transform duration-300 group-hover:scale-110">CS</span>
      </span>
      <span className="font-display text-[17px] text-slate-900">CampusShare</span>
    </Link>
  )
}

function LendButton({ className }: { className?: string }) {
  return (
    <Link
      href="/items/new"
      className={cn(
        "group relative h-10 items-center gap-1.5 overflow-hidden rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white",
        "shadow-md shadow-slate-900/15 transition hover:shadow-lg hover:shadow-indigo-600/25 active:scale-[0.97]",
        className
      )}
    >
      {/* gradient wash that slides in on hover */}
      <span
        aria-hidden
        className="absolute inset-0 translate-y-full bg-gradient-to-r from-indigo-600 to-violet-600 transition-transform duration-300 group-hover:translate-y-0"
      />
      <span className="relative text-base leading-none">+</span>
      <span className="relative">Lend an item</span>
    </Link>
  )
}

function MenuToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="mobile-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      className="grid h-10 w-10 place-items-center rounded-xl text-slate-700 transition hover:bg-slate-900/5 md:hidden"
    >
      <span className="relative block h-3.5 w-[18px]">
        <motion.span
          animate={open ? { top: "50%", rotate: 45, y: "-50%" } : { top: "0%", rotate: 0, y: "0%" }}
          className="absolute left-0 h-[2px] w-full rounded bg-current"
        />
        <motion.span
          animate={{ opacity: open ? 0 : 1 }}
          className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded bg-current"
        />
        <motion.span
          animate={open ? { bottom: "50%", rotate: -45, y: "50%" } : { bottom: "0%", rotate: 0, y: "0%" }}
          className="absolute left-0 h-[2px] w-full rounded bg-current"
        />
      </span>
    </button>
  )
}

function AccountMenu({ user }: { user: NavUser }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("pointerdown", onDown)
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const initials = (user.name ?? user.email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("")

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-xs font-bold text-indigo-700 ring-2 ring-white shadow-sm transition hover:ring-indigo-200"
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="absolute right-0 top-12 w-64 origin-top-right rounded-2xl bg-white p-1.5 shadow-xl ring-1 ring-slate-900/10"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-slate-900">{user.name ?? "Student"}</p>
              <p className="truncate text-xs text-slate-500">{user.email}</p>
              {user.rollNo && (
                <p className="mt-1.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                  {user.rollNo}
                </p>
              )}
            </div>
            <div className="my-1 h-px bg-slate-100" />
            <MenuLink href="/dashboard" onClick={() => setOpen(false)}>My stuff</MenuLink>
            <MenuLink href="/profile" onClick={() => setOpen(false)}>Profile</MenuLink>
            <MenuLink href="/items/new" onClick={() => setOpen(false)}>Lend an item</MenuLink>
            <div className="my-1 h-px bg-slate-100" />
            <button
              role="menuitem"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full rounded-xl px-3 py-2 text-left text-sm text-rose-600 transition hover:bg-rose-50"
            >
              Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link
      role="menuitem"
      href={href}
      onClick={onClick}
      className="block rounded-xl px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
    >
      {children}
    </Link>
  )
}
