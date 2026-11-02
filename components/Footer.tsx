import Link from "next/link"

const COLUMNS: { title: string; links: { href: string; label: string; external?: boolean }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/items", label: "Browse items" },
      { href: "/items/new", label: "Lend an item" },
      { href: "/#how", label: "How it works" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/dashboard", label: "My stuff" },
      { href: "/signin", label: "Sign in" },
    ],
  },
  {
    title: "Project",
    links: [
      { href: "https://github.com/Maruthi14-gif/CampusShare", label: "Source code", external: true },
    ],
  },
]

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-slate-200/80 bg-white">
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-indigo-400/60 to-transparent" />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-4 pb-10 pt-16 md:grid-cols-[1.4fr_repeat(3,1fr)] md:gap-12">
        <div className="col-span-2 max-w-xs md:col-span-1">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-[13px] font-bold text-white">
              CS
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-slate-900">CampusShare</span>
          </Link>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            Borrow what you need, lend what you don&apos;t. Free to use and free to run, for students of IIIT Dharwad.
          </p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Only @iiitdwd.ac.in accounts
          </p>
        </div>

        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-ink">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link
                    href={l.href}
                    {...(l.external ? { target: "_blank", rel: "noreferrer" } : {})}
                    className="group inline-flex items-center gap-1 text-sm text-slate-600 transition hover:text-slate-950"
                  >
                    <span className="bg-gradient-to-r from-indigo-600 to-indigo-600 bg-[length:0%_1.5px] bg-left-bottom bg-no-repeat pb-0.5 transition-[background-size] duration-300 group-hover:bg-[length:100%_1.5px]">
                      {l.label}
                    </span>
                    {l.external && <span className="text-slate-300 transition group-hover:text-slate-500">↗</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 border-t border-slate-100 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} CampusShare · Frugal Innovation project · IIIT Dharwad</p>
        <p>Made by students, for students.</p>
      </div>

      {/* oversized wordmark that fades into the page edge */}
      {/* SVG so the word always fits the width exactly, on any screen */}
      <div aria-hidden className="pointer-events-none mx-auto max-w-7xl select-none px-2 [mask-image:linear-gradient(to_bottom,black_25%,transparent_95%)]">
        <svg viewBox="0 0 1000 150" className="block w-full">
          <text
            x="500"
            y="148"
            textAnchor="middle"
            textLength="990"
            lengthAdjust="spacingAndGlyphs"
            className="font-display"
            style={{ fontSize: 196, fontWeight: 700, letterSpacing: "-0.05em" }}
            fill="none"
            stroke="rgb(203 213 225)"
            strokeWidth="1.2"
          >
            CampusShare
          </text>
        </svg>
      </div>
    </footer>
  )
}
