CREATE TABLE `quiz_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`questions` text NOT NULL,
	`answers` text NOT NULL,
	`started_at` text NOT NULL,
	`expires_at` text NOT NULL,
	`finished_at` text,
	`score` integer
);
--> statement-breakpoint
CREATE TABLE `student_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`username` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_profiles_username_unique` ON `student_profiles` (`username`);--> statement-breakpoint
CREATE TABLE `student_scores` (
	`user_id` text PRIMARY KEY NOT NULL,
	`best_score` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`achieved_at` text,
	`updated_at` text NOT NULL
);
