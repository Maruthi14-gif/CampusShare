import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const CATEGORIES = [
  "Calculator",
  "Lab coat",
  "Drafter / drawing kit",
  "Book",
  "Charger / cable",
  "Lab equipment",
  "Sports",
  "Other",
] as const

export const SLOTS = ["S1", "S2", "S3", "S4", "S5", "S6"] as const

export function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function daysLeft(d: Date | string) {
  const ms = new Date(d).getTime() - Date.now()
  return Math.ceil(ms / 86_400_000)
}

/**
 * Overdue is DERIVED, never stored. A stored `isOverdue` column would need
 * a cron job to stay true; computing it on read is always correct.
 */
export function isOverdue(loan: { dueAt: Date | string; status: string }) {
  const open = ["RESERVED", "ISSUED", "COLLECTED"]
  return open.includes(loan.status) && new Date(loan.dueAt).getTime() < Date.now()
}
