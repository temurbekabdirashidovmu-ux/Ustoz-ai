CREATE TABLE `google_accounts` (
	`subject` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`email` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `google_accounts_user_id_unique` ON `google_accounts` (`user_id`);