"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { CatalogueCard, type CatalogueItem } from "@/components/CatalogueCard"

/**
 * Browse with instant filtering. Campus-sized lists (a few hundred items)
 * are filtered in the browser, so every keystroke and tap updates at once.
 * The address bar follows along, so a filtered view can be shared as a link,
 * and the server renders the same filters for anyone who opens that link.
 */
export function BrowseClient({
  items,
  categories,
  initial,
}: {
  items: CatalogueItem[]
  categories: readonly string[]
  initial: { q: string; category: string; all: boolean }
}) {
  const [q, setQ] = useState(initial.q)
  const [cat, setCat] = useState(categories.includes(initial.category) ? initial.category : "All")
  const [all, setAll] = useState(initial.all)
  const input = useRef<HTMLInputElement>(null)

  // Keep the URL in step without a page reload.
  useEffect(() => {
    const p = new URLSearchParams()
    if (q.trim()) p.set("q", q.trim())
    if (cat !== "All") p.set("category", cat)
    if (all) p.set("all", "1")
    const qs = p.toString()
    window.history.replaceState(window.history.state, "", qs ? `/items?${qs}` : "/items")
  }, [q, cat, all])

  // "/" jumps to the search box, like on GitHub or YouTube.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        e.preventDefault()
        input.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const pool = useMemo(() => (all ? items : items.filter((i) => i.status === "AVAILABLE")), [items, all])
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const i of pool) m.set(i.category, (m.get(i.category) ?? 0) + 1)
    return m
  }, [pool])
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return pool.filter(
      (i) =>
        (cat === "All" || i.category === cat) &&
        (!term || `${i.title} ${i.description ?? ""} ${i.code} ${i.category}`.toLowerCase().includes(term))
    )
  }, [pool, cat, q])

  const free = items.filter((i) => i.status === "AVAILABLE").length
  const asked = q.trim() || (cat !== "All" ? cat : "")

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-ink sm:text-5xl">Browse</h1>
          <p className="mt-2 inline-flex items-center gap-2 font-mono text-[13px] text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {free} of {items.length} free to borrow right now
          </p>
        </div>
        <Link href="/requests" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
          Can&apos;t find it? Ask for it →
        </Link>
      </header>

      {/* search + filters scroll with the page; "/" brings the search box back */}
      <div className="mt-6 grid gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="flex h-12 min-w-0 flex-1 basis-64 items-center gap-2.5 rounded-[14px] border border-slate-200 bg-white px-3.5 focus-within:border-indigo-600 focus-within:ring-[3px] focus-within:ring-indigo-100">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-slate-500" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={input}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search calculators, lab coats, item codes…"
              aria-label="Search items"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-slate-500"
            />
            <kbd className="hidden rounded-md border border-slate-200 px-1.5 font-mono text-[11px] text-slate-500 sm:block">/</kbd>
          </label>

          <div role="group" aria-label="Show" className="flex rounded-xl border border-slate-200 bg-white p-1 max-sm:w-full">
            {[
              { v: false, label: "Free now" },
              { v: true, label: "Everything" },
            ].map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={all === o.v}
                onClick={() => setAll(o.v)}
                className={`rounded-[9px] px-3.5 py-2 text-[13px] font-semibold transition max-sm:flex-1 ${
                  all === o.v ? "bg-ink text-white" : "text-slate-600 hover:text-ink"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div role="group" aria-label="Category" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]">
          {["All", ...categories].map((c) => {
            const n = c === "All" ? pool.length : counts.get(c) ?? 0
            const on = cat === c
            return (
              <button
                key={c}
                type="button"
                aria-pressed={on}
                onClick={() => setCat(c)}
                className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13.5px] font-medium transition ${
                  on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-ink hover:border-slate-300"
                }`}
              >
                {c}
                <span className={`font-mono text-[11.5px] ${on ? "text-white/80" : "text-slate-500"}`}>{n}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div aria-live="polite" className="mt-6">
        {shown.length === 0 ? (
          <div className="grid justify-items-center gap-2.5 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <h2 className="font-display text-xl font-bold text-ink">
              {asked ? `Nobody has listed “${asked}” yet` : "Nothing here yet"}
            </h2>
            <p className="max-w-sm text-sm text-slate-600">
              Post it as a request, and anyone who has one can lend it to you in one tap.
            </p>
            <Link
              href={asked ? `/requests?title=${encodeURIComponent(asked)}` : "/requests"}
              className="mt-2 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              {asked ? `Ask for “${asked}”` : "Post a request"}
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((item, i) => (
              <CatalogueCard key={item.id} item={item} priority={i === 0} titleAs="h2" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
