/**
 * The CampusShare mark: two items overlapping, the shared corner in stamp red.
 * Same drawing as public/logo.svg, inline so it is crisp at any size and
 * needs no extra download.
 */
export function LogoMark({ className = "h-9 w-9", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="64" height="64" rx="15" fill="#12142B" />
      <rect x="12" y="12" width="26" height="26" rx="7" fill="#FFFFFF" />
      <rect x="26" y="26" width="26" height="26" rx="7" fill="#3A3ED6" />
      {/* The overlap of the two squares, drawn directly (no clipPath, so no
          duplicate ids when the mark appears several times on a page). */}
      <path d="M26 33a7 7 0 0 1 7-7h5v5a7 7 0 0 1-7 7h-5z" fill="#CF3428" />
    </svg>
  )
}
