CREATE TABLE `account_activity` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`blocked` integer DEFAULT 0 NOT NULL,
	`block_reason` text,
	`blocked_by` text,
	`blocked_at` text
);
--> statement-breakpoint
CREATE TABLE `integrity_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`run_id` text NOT NULL,
	`event_type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `quiz_runs` ADD `submitted_answers` text;