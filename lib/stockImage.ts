/**
 * Stand-in photos for items listed without one.
 *
 * Source: Wikimedia Commons — free, no API key, and every file on it is
 * Creative Commons or public domain. Results are cached by Next for a
 * week, so each lookup runs about once a week, not on every page view.
 *
 * These are ILLUSTRATIONS, never evidence of the item's condition. The UI
 * labels them "Stock photo" and credits the author, as the licences need.
 *
 * Order of preference:
 *   1. a search for the item's own name, accepted only on a strict match
 *   2. a search for a keyword hint ("extension" -> power strip)
 *   3. a hand-picked, eyeballed photo for the category (never a search,
 *      because loose searches return things like book-burning archives)
 */

export type StockImage = {
  url: string // ~800px thumbnail
  author: string
  license: string
  sourceUrl: string // the file's page on Commons
}

const WEEK = 60 * 60 * 24 * 7
const API = "https://commons.wikimedia.org/w/api.php"
const UA = "CampusShare/1.0 (IIIT Dharwad student project)"

// Checked by eye on 31 Oct 2026. All CC0 / CC BY / CC BY-SA.
const CATEGORY_FILE: Record<string, string> = {
  Calculator: "File:Casio fx-991EX Scientific Calculator.jpg",
  "Lab coat": "File:Lab coats.jpg",
  "Drafter / drawing kit": "File:Pocket set of drawing instruments MET DP232308.jpg",
  Book: "File:Library stacks of books and bookshelf.jpg",
  "Charger / cable": "File:Lenovo 65W 20V AC adapter (FRU 42T5283) for ThinkPad laptops.jpg",
  "Lab equipment": "File:Laboratory Glasswares.jpg",
  Sports: "File:Various game and sports balls, top-down.jpg",
  Other: "File:Colored pencils in holder.jpg",
}

// Title words that point to a better search than the category photo.
const KEYWORD_QUERY: [RegExp, string, string][] = [
  // [matches title, search, word the file name must contain]
  [/extension|power strip|socket|spike/i, "power strip", "strip"],
  [/arduino/i, "Arduino Uno", "arduino"],
  [/breadboard/i, "breadboard electronics", "breadboard"],
  [/umbrella/i, "umbrella", "umbrella"],
]

// Words too vague to search on. "Random thing" must not find a celebrity.
const STOP = new Set([
  "with", "and", "for", "the", "set", "kit", "item", "size", "mini", "small", "big", "large",
  "new", "old", "used", "spare", "extra", "good", "nice", "random", "thing", "things", "stuff",
  "misc", "various", "other", "some", "pair", "piece", "one", "two",
])

function words(q: string) {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
}

/** "65W USB-C laptop charger (size M)" -> "USB-C laptop charger" */
function cleanTitle(title: string) {
  return title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+(\.\d+)?\s?(w|v|a|mah|gb|m|cm|mm)\b/gi, " ")
    .replace(/\b\d+-(socket|way|pin|port)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
}

type CommonsPage = {
  index?: number
  title: string
  imageinfo?: {
    thumburl?: string
    mime?: string
    descriptionurl?: string
    extmetadata?: { Artist?: { value: string }; LicenseShortName?: { value: string } }
  }[]
}

async function commons(params: Record<string, string>): Promise<CommonsPage[]> {
  const qs = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "imageinfo",
    iiprop: "url|extmetadata|mime",
    iiurlwidth: "800",
    iiextmetadatafilter: "Artist|LicenseShortName",
    ...params,
  })
  const res = await fetch(`${API}?${qs}`, {
    headers: { "User-Agent": UA },
    next: { revalidate: WEEK },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return []
  const json = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } }
  return Object.values(json.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
}

function toStock(page: CommonsPage): StockImage | null {
  const info = page.imageinfo?.[0]
  if (!info?.thumburl || !/^image\/(jpeg|png|webp)$/.test(info.mime ?? "")) return null
  const author = (info.extmetadata?.Artist?.value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/^Creator:/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  return {
    url: info.thumburl,
    author: author || "Unknown author",
    license: info.extmetadata?.LicenseShortName?.value ?? "see source",
    sourceUrl: info.descriptionurl ?? "https://commons.wikimedia.org",
  }
}

/** Search, keeping only a result whose file name has every word in `mustAll`. */
async function search(query: string, mustAll: string[]): Promise<StockImage | null> {
  const pages = await commons({
    generator: "search",
    gsrnamespace: "6", // File: pages only
    gsrsearch: `${query} filetype:bitmap`,
    gsrlimit: "6",
  })
  for (const page of pages) {
    const name = page.title.toLowerCase()
    if (!mustAll.every((w) => name.includes(w))) continue
    const stock = toStock(page)
    if (stock) return stock
  }
  return null
}

async function byTitle(fileTitle: string): Promise<StockImage | null> {
  const [page] = await commons({ titles: fileTitle })
  return page ? toStock(page) : null
}

/** Best-effort: returns null on any failure, and the card falls back to its tag-code art. */
export async function findStockImage(title: string, category: string): Promise<StockImage | null> {
  try {
    // 1. The item's own name. Not for books: "Engineering Mechanics" finds buildings.
    if (category !== "Book") {
      const q = cleanTitle(title)
      const w = words(q)
      if (w.length > 0) {
        const own = await search(q, w)
        if (own) return own
      }
    }

    // 2. A keyword hint from the title.
    const hint = KEYWORD_QUERY.find(([re]) => re.test(title))
    if (hint) {
      const viaHint = await search(hint[1], [hint[2]])
      if (viaHint) return viaHint
    }

    // 3. The hand-picked photo for the category.
    return await byTitle(CATEGORY_FILE[category] ?? CATEGORY_FILE.Other)
  } catch {
    return null
  }
}
