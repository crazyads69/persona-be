import { defineConfig } from "drizzle-kit";
import { getEnvOrThrow } from "./src/utils";

export default defineConfig({
	out: "./drizzle",
	schema: "./src/db/schema.ts",
	dialect: "turso",
	dbCredentials: {
		url: getEnvOrThrow("TURSO_DATABASE_URL"),
		authToken: getEnvOrThrow("TURSO_AUTH_TOKEN"),
	},
});
