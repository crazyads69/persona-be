import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { uuidv7 } from "uuidv7";

// Repeatable base fields for all tables to extend
const baseFields = {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => uuidv7()),
	createdAt: text("created_at").notNull().default(sql`(current_timestamp)`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(current_timestamp)`)
		.$onUpdate(() => sql`(current_timestamp)`),
	deletedAt: text("deleted_at"),
};

// Users table
export const users = sqliteTable(
	"users",
	{
		...baseFields,

		firebaseUid: text("firebase_uid").notNull().unique(), // Changed from clerkUserId
		email: text("email").notNull().unique(),
		username: text("username").notNull().unique(),
		displayName: text("display_name"),
		avatarUrl: text("avatar_url"),
		bio: text("bio"),
	},
	(table) => [
		index("idx_users_firebase_uid").on(table.firebaseUid),
		index("idx_users_email").on(table.email),
		index("idx_users_username").on(table.username),
		index("idx_users_deleted_at").on(table.deletedAt),
	]
);

export const characters = sqliteTable(
	"characters",
	{
		...baseFields,

		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		avatarUrl: text("avatar_url"),
		description: text("description"),
		systemPrompt: text("system_prompt").notNull(),
		isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
	},
	(table) => [
		index("idx_characters_user_id").on(table.userId),
		index("idx_characters_deleted_at").on(table.deletedAt),
		index("idx_characters_public").on(table.isPublic, table.createdAt),
	]
);

export const chats = sqliteTable(
	"chats",
	{
		...baseFields,

		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		characterId: text("character_id")
			.notNull()
			.references(() => characters.id, { onDelete: "cascade" }),
		title: text("title"),
		lastMessageAt: text("last_message_at").notNull().default(sql`(current_timestamp)`),
		messageCount: integer("message_count").notNull().default(0),
	},
	(table) => [
		index("idx_chats_user_recent").on(table.userId, table.lastMessageAt),
		index("idx_chats_character_id").on(table.characterId),
		index("idx_chats_deleted_at").on(table.deletedAt),
	]
);

export const messages = sqliteTable(
	"messages",
	{
		...baseFields,

		chatId: text("chat_id")
			.notNull()
			.references(() => chats.id, { onDelete: "cascade" }),
		role: text("role", { enum: ["user", "assistant"] }).notNull(),
		content: text("content").notNull(),
		tokenCount: integer("token_count"),
	},
	(table) => [
		index("idx_messages_chat_id").on(table.chatId, table.id),
		index("idx_messages_deleted_at").on(table.deletedAt),
	]
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Character = typeof characters.$inferSelect;
export type NewCharacter = typeof characters.$inferInsert;

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export const usersRelations = relations(users, ({ many }) => ({
	characters: many(characters),
	chats: many(chats),
}));

export const charactersRelations = relations(characters, ({ one, many }) => ({
	user: one(users, {
		fields: [characters.userId],
		references: [users.id],
	}),
	chats: many(chats),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
	user: one(users, {
		fields: [chats.userId],
		references: [users.id],
	}),
	character: one(characters, {
		fields: [chats.characterId],
		references: [characters.id],
	}),
	messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
	chat: one(chats, {
		fields: [messages.chatId],
		references: [chats.id],
	}),
}));
