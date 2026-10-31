import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Next 16 ships `cacheComponents: true` by default, which forbids
  // `export const dynamic = "force-dynamic"` in a route segment.
  // Every page here reads live data from Postgres, so we opt out and
  // keep the simpler Next 15 behaviour that most docs still describe.
  cacheComponents: false,

  // Photos go through Next's image resizer: each card gets a small WebP or
  // AVIF from our own domain instead of a full-size JPEG from Wikimedia.
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "thumb.wikimedia.org" },
    ],
    // Stored photos are served by app/photo/[kind]/[id]; ?v= changes with the photo.
    localPatterns: [{ pathname: "/photo/**" }],
    minimumCacheTTL: 2678400, // 31 days
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
