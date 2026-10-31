/**
 * Campus settings — edit these to match IIIT Dharwad.
 * Safe to import from both server and browser code.
 */

// Hostel names exactly as students know them. Two students in the SAME
// hostel may hand over at the lender's room; anyone else meets at a spot.
export const HOSTELS = ["Boys Hostel 1", "Boys Hostel 2", "Girls Hostel"] as const

// Busy, public places for handovers between different hostels.
export const MEET_SPOTS = [
  "Library entrance",
  "Academic block lobby",
  "Mess entrance",
  "Main gate security desk",
] as const

export const RULES = {
  loanDays: 3, // default length of a loan
  maxLoanDays: 14,
  reserveHoldHours: 24, // reservation cancels itself if not handed over by then
  maxActiveBorrows: 2, // items one student can hold at once
  maxOpenRequests: 3,
  maxExtendDays: 3,
  strikeWindowDays: 60, // late returns / problems / losses counted over this window
  strikesToBlock: 2,
  blockDays: 14, // borrowing pause after too many strikes
  waitlistHoldHours: 12, // next in line gets the item to themselves this long
  otpMaxTries: 5, // wrong codes before a fresh one is issued
  lostAfterOverdueDays: 7, // owner may mark it lost after this
} as const

/**
 * Last day of the semester, as YYYY-MM-DD in the SEMESTER_END environment
 * variable. No loan may run past it. Unset = no cap.
 */
export function semesterEnd(): Date | null {
  const v = process.env.SEMESTER_END
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null
  return new Date(`${v}T23:59:59+05:30`)
}

/** Indian mobile number -> wa.me link, or null. */
export function whatsappLink(phone: string | null | undefined, text?: string) {
  const digits = (phone ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "")
  if (!/^[6-9]\d{9}$/.test(digits)) return null
  return `https://wa.me/91${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}
