import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
	// Server
	PORT: z.string().default("3000"),

	// Turso Database
	TURSO_DATABASE_URL: z.string().url("TURSO_DATABASE_URL must be a valid URL"),
	TURSO_AUTH_TOKEN: z.string().min(1, "TURSO_AUTH_TOKEN is required"),

	// Firebase Admin SDK
	FIREBASE_ADMIN_CREDENTIAL: z.string().min(1, "FIREBASE_ADMIN_CREDENTIAL is required"),
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
