import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    host: "gateway01.us-east-1.prod.aws.tidbcloud.com",
    port: 4000,
    user: "6xu4es1gkiCn1Ac.root",
    password: "aidyn3tBRRAVvPO9",
    database: "test",
    ssl: { rejectUnauthorized: true },
  },
});
