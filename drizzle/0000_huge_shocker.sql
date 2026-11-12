CREATE TABLE `site_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_usage` (
	`day` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
