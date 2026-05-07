import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

loadEnv({ path: ".env.local", override: false });
loadEnv({ override: false });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL is not set.\n" +
    "   Set it in .env.local to the DIRECT (non-pooled) Supabase connection string.\n" +
    "   Example: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // ⚠️ NO datasource block here — it would override schema.prisma silently.
});
