-- Booking notifications (the bell in POS and Management).
--
-- When a customer books through the website, booking-bridge.php stores the booking and then a
-- "New booking received" notification for every user of that outlet who may view bookings.
-- Without these four tables the booking is still saved, but no notification is created and the
-- bell cannot load its inbox (notifications.php answers 503).
--
-- Same definitions as database/SCHEMA-CURRENT.sql. Only creates the tables when they are missing;
-- no existing data is changed. Safe to run more than once. Back up first.
--
-- After this runs, the next time the bell refreshes it also creates notifications for website
-- bookings made in the last 7 days that never got one.

CREATE TABLE IF NOT EXISTS `sp_notifications` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_key` char(64) NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `event_type` varchar(40) NOT NULL,
  `title` varchar(120) NOT NULL,
  `body` varchar(240) NOT NULL,
  `data_json` longtext NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sp_notifications_event_key` (`event_key`),
  KEY `ix_sp_notifications_outlet_created` (`outlet_id`,`created_at`,`id`),
  CONSTRAINT `fk_sp_notifications_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sp_push_subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `endpoint_hash` char(64) NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth_secret` text NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `device_label` varchar(180) NOT NULL DEFAULT '',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_used_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sp_push_endpoint_hash` (`endpoint_hash`),
  KEY `ix_sp_push_user_outlet_active` (`user_id`,`outlet_id`,`active`),
  KEY `fk_sp_push_outlet` (`outlet_id`),
  CONSTRAINT `fk_sp_push_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  CONSTRAINT `fk_sp_push_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sp_notification_recipients` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `notification_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sp_notification_recipient` (`notification_id`,`user_id`),
  KEY `ix_sp_notification_recipient_unread` (`user_id`,`read_at`,`notification_id`),
  CONSTRAINT `fk_sp_notification_recipient_event` FOREIGN KEY (`notification_id`) REFERENCES `sp_notifications` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sp_notification_recipient_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sp_notification_deliveries` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `recipient_id` bigint(20) UNSIGNED NOT NULL,
  `subscription_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('PENDING','PROCESSING','SENT','RETRY','EXPIRED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  `attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `next_attempt_at` datetime NOT NULL DEFAULT current_timestamp(),
  `processing_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `last_error_code` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sp_notification_delivery_target` (`recipient_id`,`subscription_id`),
  KEY `ix_sp_notification_delivery_due` (`status`,`next_attempt_at`,`id`),
  KEY `fk_sp_notification_delivery_subscription` (`subscription_id`),
  CONSTRAINT `fk_sp_notification_delivery_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `sp_notification_recipients` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sp_notification_delivery_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `sp_push_subscriptions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check: four tables should be listed
SHOW TABLES LIKE 'sp_notification%';
SHOW TABLES LIKE 'sp_push_subscriptions';
