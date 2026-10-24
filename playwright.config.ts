import { defineConfig } from "@playwright/test";

const PUERTO = 3100;

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  use: { baseURL: `http://localhost:${PUERTO}` },
  webServer: {
    command: `npx next dev -p ${PUERTO}`,
    port: PUERTO,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { LLM_SIMULADO: "1" },
  },
});
