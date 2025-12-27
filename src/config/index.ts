import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	// Server
	PORT: z.string().default("8080"),

	// Turso Database
	TURSO_DATABASE_URL: z.url("TURSO_DATABASE_URL must be a valid URL"),
	TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),

	// Firebase Admin SDK
	FIREBASE_ADMIN_CREDENTIAL: z.string().min(1, "FIREBASE_ADMIN_CREDENTIAL is required"),

	// Upstash Redis
	UPSTASH_REDIS_REST_URL: z.url("UPSTASH_REDIS_REST_URL must be a valid URL"),
	UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),

	// Upstash QStash
	QSTASH_URL: z.url().default("https://qstash.upstash.io"),
	QSTASH_TOKEN: z.string().min(1, "QSTASH_TOKEN is required"),
	QSTASH_CURRENT_SIGNING_KEY: z.string().min(1, "QSTASH_CURRENT_SIGNING_KEY is required"),
	QSTASH_NEXT_SIGNING_KEY: z.string().min(1, "QSTASH_NEXT_SIGNING_KEY is required"),

	// API Base URL (for QStash callbacks)
	API_BASE_URL: z.url("API_BASE_URL must be a valid URL"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
	try {
		const parsedEnv = envSchema.parse(process.env);
		console.log("✅ Environment variables validated successfully.");
		return parsedEnv;
	} catch (error) {
		if (error instanceof z.ZodError) {
			const errors = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`);
			console.error("❌ Environment validation failed:");
			for (const err of errors) {
				console.error(`  - ${err}`);
			}
		}
		process.exit(1);
	}
}

export const env = validateEnv();
