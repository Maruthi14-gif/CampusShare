import { cn } from "@/lib/utils"

/* ── Button ────────────────────────────────────────────── */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger"
  size?: "sm" | "md" | "lg"
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
        size === "sm" && "h-9 px-3 text-sm",
        size === "md" && "h-11 px-5 text-sm",
        size === "lg" && "h-13 px-7 text-base",
        variant === "primary" &&
          "bg-ink text-white hover:bg-indigo-700",
        variant === "secondary" &&
          "bg-white text-ink ring-1 ring-slate-200 hover:ring-slate-300",
        variant === "ghost" && "text-slate-600 hover:bg-slate-100",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
    />
  )
}

/* ── Badge ─────────────────────────────────────────────── */

const TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  blue: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  grey: "bg-slate-100 text-slate-600 ring-slate-200",
} as const

export function Badge({
  tone = "grey",
  children,
  className,
}: {
  tone?: keyof typeof TONES
  children: React.ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className
      )}
    >
      {children}
    </span>
  )
}

/** Maps an item or loan status to a coloured badge. */
const STATUS_TONE: Record<string, keyof typeof TONES> = {
  AVAILABLE: "green",
  VERIFIED: "green",
  RESERVED: "amber",
  ISSUED: "blue",
  COLLECTED: "blue",
  RETURNED: "amber",
  AWAITING_CHECK: "amber",
  PROBLEM: "red",
  LOST: "red",
  PAUSED: "grey",
  CANCELLED: "grey",
  EXPIRED: "grey",
}

// What each status means to a student, in plain words.
const STATUS_LABEL: Record<string, string> = {
  ISSUED: "with borrower",
  COLLECTED: "with borrower",
  AWAITING_CHECK: "being checked",
  RETURNED: "returned",
  PROBLEM: "problem reported",
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "grey"}>
      {STATUS_LABEL[status] ?? status.replace("_", " ").toLowerCase()}
    </Badge>
  )
}

/* ── Card ──────────────────────────────────────────────── */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-2xl bg-white ring-1 ring-slate-200",
        className
      )}
    />
  )
}

/* ── Form fields ───────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

const fieldStyles =
  "w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-500 outline-none"

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldStyles, props.className)} />
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return <textarea {...props} className={cn(fieldStyles, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldStyles, props.className)} />
}

/* ── Empty state ───────────────────────────────────────── */

export function Empty({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
