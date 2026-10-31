/**
 * Photos are stored in Postgres as data URLs (see PhotoInput). Pasting
 * those straight into pages made Browse a 1.4 MB download, because every
 * photo travelled inside the HTML and could never be cached.
 *
 * Instead, pages link to /photo/<kind>/<id>?v=<version>. The route decodes
 * the photo once and the browser caches it for a year; the version changes
 * whenever the photo does, so a replaced photo is fetched fresh.
 */

export type PhotoKind = "item" | "log"

/** Short, stable fingerprint of a data URL: changes when the photo changes. */
function version(dataUrl: string) {
  let h = 5381
  const sample = dataUrl.length > 4096 ? dataUrl.slice(0, 2048) + dataUrl.slice(-2048) : dataUrl
  for (let i = 0; i < sample.length; i++) h = ((h << 5) + h + sample.charCodeAt(i)) | 0
  return `${(h >>> 0).toString(36)}${dataUrl.length.toString(36)}`
}

/** The URL a page should use for a stored photo, or null when there is none. */
export function photoSrc(kind: PhotoKind, id: string, dataUrl: string | null | undefined) {
  if (!dataUrl) return null
  return `/photo/${kind}/${id}?v=${version(dataUrl)}`
}

/** Turns a stored data URL back into bytes for the photo route. */
export function decodePhoto(dataUrl: string): { type: string; bytes: Buffer } | null {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/.exec(dataUrl)
  if (!m) return null
  return { type: m[1], bytes: Buffer.from(m[2], "base64") }
}
