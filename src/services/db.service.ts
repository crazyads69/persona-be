import { eq } from "drizzle-orm";
import { db } from "../db";
import type {
	Character,
	Chat,
	Message,
	NewCharacter,
	NewChat,
	NewMessage,
	NewUser,
	User,
} from "../db/schema";
import { characters, chats, messages, users } from "../db/schema";
import type { WriteJobPayload } from "../lib/qstash";

/**
 * Database Sync Service
 * Processes background write jobs from QStash and syncs data to Turso
 */
export class DatabaseService {
	/**
	 * Process a write job and sync to database
	 */
	async processWriteJob(payload: WriteJobPayload): Promise<void> {
		console.log(`🔄 Processing write job: ${payload.table}/${payload.operation}/${payload.id}`);

		try {
			switch (payload.table) {
				case "users":
					await this.syncUser(payload as WriteJobPayload<NewUser | Partial<User>>);
					break;
				case "characters":
					await this.syncCharacter(payload as WriteJobPayload<NewCharacter | Partial<Character>>);
					break;
				case "chats":
					await this.syncChat(payload as WriteJobPayload<NewChat | Partial<Chat>>);
					break;
				case "messages":
					await this.syncMessage(payload as WriteJobPayload<NewMessage | Partial<Message>>);
					break;
				default:
					console.error(`❌ Unknown table: ${payload.table}`);
			}

			console.log(`✅ Write job completed: ${payload.table}/${payload.operation}/${payload.id}`);
		} catch (error) {
			console.error(
				`❌ Write job failed: ${payload.table}/${payload.operation}/${payload.id}`,
				error
			);
			throw error;
		}
	}

	/**
	 * Sync user data to database
	 */
	private async syncUser(payload: WriteJobPayload<NewUser | Partial<User>>): Promise<void> {
		switch (payload.operation) {
			case "create": {
				const userData = payload.data as NewUser;
				await db.insert(users).values(userData);
				break;
			}
			case "update": {
				const updates = payload.data as Partial<User>;
				await db
					.update(users)
					.set({
						...updates,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(users.id, payload.id));
				break;
			}
			case "delete": {
				// Soft delete
				await db
					.update(users)
					.set({
						deletedAt: new Date().toISOString(),
					})
					.where(eq(users.id, payload.id));
				break;
			}
		}
	}

	/**
	 * Sync character data to database
	 */
	private async syncCharacter(
		payload: WriteJobPayload<NewCharacter | Partial<Character>>
	): Promise<void> {
		switch (payload.operation) {
			case "create": {
				const characterData = payload.data as NewCharacter;
				await db.insert(characters).values(characterData);
				break;
			}
			case "update": {
				const updates = payload.data as Partial<Character>;
				await db
					.update(characters)
					.set({
						...updates,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(characters.id, payload.id));
				break;
			}
			case "delete": {
				await db
					.update(characters)
					.set({
						deletedAt: new Date().toISOString(),
					})
					.where(eq(characters.id, payload.id));
				break;
			}
		}
	}

	/**
	 * Sync chat data to database
	 */
	private async syncChat(payload: WriteJobPayload<NewChat | Partial<Chat>>): Promise<void> {
		switch (payload.operation) {
			case "create": {
				const chatData = payload.data as NewChat;
				await db.insert(chats).values(chatData);
				break;
			}
			case "update": {
				const updates = payload.data as Partial<Chat>;
				await db
					.update(chats)
					.set({
						...updates,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(chats.id, payload.id));
				break;
			}
			case "delete": {
				await db
					.update(chats)
					.set({
						deletedAt: new Date().toISOString(),
					})
					.where(eq(chats.id, payload.id));
				break;
			}
		}
	}

	/**
	 * Sync message data to database
	 */
	private async syncMessage(
		payload: WriteJobPayload<NewMessage | Partial<Message>>
	): Promise<void> {
		switch (payload.operation) {
			case "create": {
				const messageData = payload.data as NewMessage;
				await db.insert(messages).values(messageData);
				break;
			}
			case "update": {
				const updates = payload.data as Partial<Message>;
				await db
					.update(messages)
					.set({
						...updates,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(messages.id, payload.id));
				break;
			}
			case "delete": {
				await db
					.update(messages)
					.set({
						deletedAt: new Date().toISOString(),
					})
					.where(eq(messages.id, payload.id));
				break;
			}
		}
	}

	/**
	 * Batch process multiple write jobs
	 */
	async batchProcessJobs(payloads: WriteJobPayload[]): Promise<void> {
		console.log(`🔄 Batch processing ${payloads.length} write jobs`);

		const results = await Promise.allSettled(
			payloads.map((payload) => this.processWriteJob(payload))
		);

		const failed = results.filter((r) => r.status === "rejected").length;
		const succeeded = results.filter((r) => r.status === "fulfilled").length;

		console.log(`✅ Batch completed: ${succeeded} succeeded, ${failed} failed`);

		if (failed > 0) {
			const errors = results
				.filter((r) => r.status === "rejected")
				.map((r) => (r as PromiseRejectedResult).reason);
			console.error("❌ Batch errors:", errors);
		}
	}
}

export const dbService = new DatabaseService();
