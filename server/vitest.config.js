import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(
    mode,
    process.cwd(),
    ""
  );

  Object.assign(process.env, env);

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