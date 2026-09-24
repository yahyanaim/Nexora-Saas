import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
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
      thresholds: {
        lines: 60,
        branches: 50,
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
