ALTER TABLE `users` RENAME COLUMN "clerk_user_id" TO "firebase_uid";--> statement-breakpoint
DROP INDEX `users_clerk_user_id_unique`;--> statement-breakpoint
DROP INDEX `idx_users_clerk_user_id`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_firebase_uid_unique` ON `users` (`firebase_uid`);--> statement-breakpoint
CREATE INDEX `idx_users_firebase_uid` ON `users` (`firebase_uid`);