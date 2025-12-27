import { Client, type PublishRequest } from "@upstash/qstash";
import { env } from "../../config";

export const qstash = new Client({
	token: env.QSTASH_TOKEN,
});

export type WriteOperation = "create" | "update" | "delete";

export interface WriteJobPayload<T = unknown> {
	operation: WriteOperation;
	table: "users" | "characters" | "chats" | "messages"; // All entities that can be synced to DB (all tables)
	id: string;
	data?: T;
	timestamp: number;
}

/**
 * Publish a write job to QStash for background processing
 */
export async function publishWriteJob<T>(payload: WriteJobPayload<T>, delaySeconds = 0) {
	const endpoint = `${env.API_BASE_URL}/api/v1/internal/sync-to-db`;

	const publishOptions: PublishRequest<WriteJobPayload<T>> = {
		url: endpoint,
		body: payload,
		headers: {
			"Content-Type": "application/json",
		},
	};

	// Add delay if specified
	if (delaySeconds > 0) {
		publishOptions.delay = delaySeconds;
	}

	try {
		const result = await qstash.publishJSON(publishOptions);
		console.log(`✅ Write job published: ${payload.table}/${payload.operation}/${payload.id}`);
		return result;
	} catch (error) {
		console.error(`❌ Failed to publish write job: ${error}`);
		throw error;
	}
}

/**
 * Verify QStash signature for incoming requests from QStash
 */
export async function verifyQStashSignature(signature: string, body: string): Promise<boolean> {
	try {
		const { Receiver } = await import("@upstash/qstash"); // Dynamic import to avoid loading in non-QStash contexts
		const receiver = new Receiver({
			currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
			nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
		});

		await receiver.verify({
			signature,
			body,
		});

		return true;
	} catch (error) {
		console.error("QStash signature verification failed:", error);
		return false;
	}
}
