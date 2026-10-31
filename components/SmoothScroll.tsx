"use client"

import { useEffect } from "react"
import Lenis from "lenis"

declare global {
  interface Window {
    /** The page's Lenis instance, for scroll-driven animations (MacBookScroll). */
    __lenis?: Lenis
  }
}

/**
 * Lenis smooth scrolling for every page (about 4 KB).
 * Skipped entirely when the student's device asks for reduced motion, and
 * on touch screens Lenis leaves the phone's own native scrolling alone.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    window.__lenis = lenis

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  return null
}
