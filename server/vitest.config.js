import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    process.cwd(),
    ""
  );

for (const [key, value] of Object.entries(env)) {
  if (process.env[key] === undefined) {
    process.env[key] = value;
  }
}
  return {
    test: {
      environment: "node",
      setupFiles: [
        "./tests/setup.js",
      ],
      fileParallelism: false,
    },
  };
});