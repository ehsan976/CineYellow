import { defineConfig } from "drizzle-kit";
import { loadEnvConfig } from "@next/env";

// Read .env the same way Next.js does, so drizzle-kit sees DATABASE_URL.
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
