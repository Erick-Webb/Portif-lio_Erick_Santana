CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`trainerId` int NOT NULL,
	`studentId` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`scheduledAt` bigint NOT NULL,
	`durationMinutes` int NOT NULL DEFAULT 60,
	`roomName` varchar(128) NOT NULL,
	`status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_roomName_unique` UNIQUE(`roomName`)
);
--> statement-breakpoint
CREATE TABLE `trainer_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`specialty` varchar(255),
	`bio` text,
	`experience` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `trainer_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `appRole` enum('trainer','student');--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `onboardingDone` int DEFAULT 0 NOT NULL;