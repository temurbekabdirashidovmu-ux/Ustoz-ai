CREATE TABLE `local_game_results` (
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`correct` integer NOT NULL,
	`total` integer NOT NULL,
	`coins` integer NOT NULL,
	`device_time` text NOT NULL,
	`received_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `id`)
);
--> statement-breakpoint
CREATE INDEX `local_game_user_time` ON `local_game_results` (`user_id`,`received_at`);--> statement-breakpoint
CREATE TABLE `local_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`local_name` text NOT NULL,
	`games` integer NOT NULL,
	`best_percent` integer NOT NULL,
	`coins` integer NOT NULL,
	`lessons` integer NOT NULL,
	`updated_at` text NOT NULL
);
