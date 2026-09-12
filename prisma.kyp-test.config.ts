import { defineConfig } from "prisma/config";
export default defineConfig({ schema: "prisma/schema.prisma", migrations: { path: "prisma/migrations" }, datasource: { url: "postgresql://elvin@127.0.0.1:55439/postgres?sslmode=disable" } });
