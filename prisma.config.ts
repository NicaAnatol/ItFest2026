import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  datasource: {
    // Fallback needed for `prisma generate` in CI where .env.local doesn't exist.
    // The real URL is injected at runtime (ECS Secrets Manager / .env.local).
    url: process.env.DATABASE_URL ?? "mongodb://placeholder:27017/placeholder",
  },
});
