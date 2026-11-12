CREATE TABLE `pilot_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`pre_score` integer NOT NULL,
	`post_score` integer NOT NULL,
	`rating` integer NOT NULL,
	`created_at` text NOT NULL
);
