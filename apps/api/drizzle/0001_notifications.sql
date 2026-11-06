CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `notification_prefs` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`reminders_enabled` integer DEFAULT true NOT NULL,
	`reminder_time` text DEFAULT '09:00' NOT NULL,
	`discreet` integer DEFAULT true NOT NULL,
	`notify_assigned` integer DEFAULT true NOT NULL,
	`notify_completed` integer DEFAULT true NOT NULL,
	`notify_reviewed` integer DEFAULT true NOT NULL,
	`notify_rewards` integer DEFAULT true NOT NULL,
	`last_reminder_date` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`url` text DEFAULT '/' NOT NULL,
	`read_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_unique` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_user_idx` ON `push_subscriptions` (`user_id`);