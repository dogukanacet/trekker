import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: { alias: { "@": path.resolve(process.cwd(), "src") } },
  test: {
    include: ["tests/**/*.itest.ts"],
    // mode is "test", so .env.test overrides .env
    env: loadEnv(mode, process.cwd(), ""),
    setupFiles: ["tests/setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
}));
