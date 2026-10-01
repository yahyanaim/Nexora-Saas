import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    // next-intl imports "next/navigation" without an extension; inlining lets
    // Vite resolve it instead of Node's strict ESM loader.
    server: { deps: { inline: ["next-intl"] } },
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
    },
    env: {
      NEXT_PUBLIC_API_URL: "http://localhost:40001/api",
      NODE_ENV: "test",
      NEXT_PUBLIC_DEMO_MODE: "true",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      // Ratchet: set to the current baseline; raise as coverage improves
      thresholds: {
        lines: 70,
        branches: 45,
      },
      exclude: [
        "node_modules/**",
        ".next/**",
        "out/**",
        "dist/**",
        "coverage/**",
        "**/*.d.ts",
        "**/*.config.*",
        "**/test/**",
        "**/*.test.*",
        "**/*.spec.*",
      ],
    },
  },
})
