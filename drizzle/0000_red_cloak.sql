CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`avatar_url` text,
	`description` text,
	`system_prompt` text NOT NULL,
	`is_public` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_characters_user_id` ON `characters` (`user_id`);

--> statement-breakpoint
CREATE INDEX `idx_characters_deleted_at` ON `characters` (`deleted_at`);

--> statement-breakpoint
CREATE INDEX `idx_characters_public` ON `characters` (`is_public`, `created_at`);

--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`deleted_at` text,
	`user_id` text NOT NULL,
	`character_id` text NOT NULL,
	`title` text,
	`last_message_at` text DEFAULT (current_timestamp) NOT NULL,
	`message_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_chats_user_recent` ON `chats` (`user_id`, `last_message_at`);

--> statement-breakpoint
CREATE INDEX `idx_chats_character_id` ON `chats` (`character_id`);

--> statement-breakpoint
CREATE INDEX `idx_chats_deleted_at` ON `chats` (`deleted_at`);

--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`deleted_at` text,
	`chat_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`token_count` integer,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
CREATE INDEX `idx_messages_chat_id` ON `messages` (`chat_id`, `id`);

--> statement-breakpoint
CREATE INDEX `idx_messages_deleted_at` ON `messages` (`deleted_at`);

--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	`deleted_at` text,
	`clerk_user_id` text NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`display_name` text,
	`avatar_url` text,
	`bio` text
);

--> statement-breakpoint
CREATE UNIQUE INDEX `users_clerk_user_id_unique` ON `users` (`clerk_user_id`);

--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);

--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);

--> statement-breakpoint
CREATE INDEX `idx_users_clerk_user_id` ON `users` (`clerk_user_id`);

--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);

--> statement-breakpoint
CREATE INDEX `idx_users_username` ON `users` (`username`);

--> statement-breakpoint
CREATE INDEX `idx_users_deleted_at` ON `users` (`deleted_at`);