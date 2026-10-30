import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Next 16 ships `cacheComponents: true` by default, which forbids
  // `export const dynamic = "force-dynamic"` in a route segment.
  // Every page here reads live data from Postgres, so we opt out and
  // keep the simpler Next 15 behaviour that most docs still describe.
  cacheComponents: false,

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
