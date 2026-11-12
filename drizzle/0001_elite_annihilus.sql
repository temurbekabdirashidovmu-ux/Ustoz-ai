CREATE TABLE `books` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`author` text NOT NULL,
	`language` text DEFAULT 'uz' NOT NULL,
	`category` text DEFAULT 'Boshqa' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`object_key` text NOT NULL,
	`hash` text NOT NULL,
	`size` integer NOT NULL,
	`original_name` text NOT NULL,
	`search_text` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `books_hash_unique` ON `books` (`hash`);