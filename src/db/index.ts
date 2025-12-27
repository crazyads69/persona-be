import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { getEnvOrThrow } from "../utils";
import * as schema from "./schema";

const client = createClient({
	url: getEnvOrThrow("TURSO_DATABASE_URL"),
	authToken: getEnvOrThrow("TURSO_AUTH_TOKEN"),
});

export const db = drizzle(client, { schema });
