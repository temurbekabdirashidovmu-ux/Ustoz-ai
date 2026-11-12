CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text NOT NULL,
	`actor_email` text NOT NULL,
	`action` text NOT NULL,
	`target_id` text NOT NULL,
	`label` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `admin_members` (
	`email` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`active` integer DEFAULT 1 NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_seen_at` text
);
