"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui"

/**
 * Photo capture that needs no cloud storage account.
 *
 * The file is drawn onto a canvas, resized to max 900px and encoded as a
 * ~60–120 KB JPEG data URL, which is stored directly in Postgres.
 *
 * WHY: at pilot scale (one campus, a few hundred items) this removes an
 * entire third-party dependency — no S3 bucket, no signed URLs, no extra
 * signup. It is a deliberate trade-off, not an oversight: beyond a few
 * thousand photos this belongs in object storage, because large base64
 * rows bloat every query that touches the table.
 */
export function PhotoInput({
  name,
  label = "Photo",
  value,
  onChange,
  required,
}: {
  name: string
  label?: string
  value: string
  onChange: (dataUrl: string) => void
  required?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File) {
    setError(null)
    if (!file.type.startsWith("image/")) {
      setError("That isn't an image file.")
      return
    }
    setBusy(true)
    try {
      const dataUrl = await compress(file, 900, 0.65)
      onChange(dataUrl)
    } catch {
      setError("Could not read that image. Try another one.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />
      <input type="hidden" name={name} value={value} />

      {value ? (
        <div className="relative overflow-hidden rounded-xl ring-1 ring-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="h-48 w-full object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-2 top-2 rounded-lg bg-white/90 px-2.5 py-1 text-xs
                       font-medium text-slate-700 shadow-sm backdrop-blur"
          >
            Replace
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="secondary"
          className="h-28 w-full border border-dashed border-slate-300 bg-slate-50/60"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Processing…" : "Take or choose a photo"}
        </Button>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function compress(file: File, maxSide: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("read failed"))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error("decode failed"))
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext("2d")
        if (!ctx) return reject(new Error("no canvas context"))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
