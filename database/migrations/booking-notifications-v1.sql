-- SP-Manager notification foundation. Additive; preserves existing records.
-- Apply once to the existing Central MySQL database after backing it up.

CREATE TABLE IF NOT EXISTS sp_notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  event_key CHAR(64) NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  booking_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(40) NOT NULL,
  title VARCHAR(120) NOT NULL,
  body VARCHAR(240) NOT NULL,
  data_json LONGTEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sp_notifications_event_key (event_key),
  KEY ix_sp_notifications_outlet_created (outlet_id, created_at, id),
  CONSTRAINT fk_sp_notifications_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sp_notification_recipients (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  notification_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  read_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sp_notification_recipient (notification_id, user_id),
  KEY ix_sp_notification_recipient_unread (user_id, read_at, notification_id),
  CONSTRAINT fk_sp_notification_recipient_event FOREIGN KEY (notification_id) REFERENCES sp_notifications(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_notification_recipient_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sp_push_subscriptions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  endpoint_hash CHAR(64) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_secret TEXT NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  device_label VARCHAR(180) NOT NULL DEFAULT '',
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_used_at DATETIME DEFAULT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sp_push_endpoint_hash (endpoint_hash),
  KEY ix_sp_push_user_outlet_active (user_id, outlet_id, active),
  CONSTRAINT fk_sp_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_push_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sp_notification_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  recipient_id BIGINT UNSIGNED NOT NULL,
  subscription_id BIGINT UNSIGNED NOT NULL,
  status ENUM('PENDING','PROCESSING','SENT','RETRY','EXPIRED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processing_at DATETIME DEFAULT NULL,
  sent_at DATETIME DEFAULT NULL,
  last_error_code VARCHAR(40) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sp_notification_delivery_target (recipient_id, subscription_id),
  KEY ix_sp_notification_delivery_due (status, next_attempt_at, id),
  CONSTRAINT fk_sp_notification_delivery_recipient FOREIGN KEY (recipient_id) REFERENCES sp_notification_recipients(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_notification_delivery_subscription FOREIGN KEY (subscription_id) REFERENCES sp_push_subscriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rollback (manual, only if the feature is being removed):
-- DROP TABLE sp_notification_deliveries;
-- DROP TABLE sp_push_subscriptions;
-- DROP TABLE sp_notification_recipients;
-- DROP TABLE sp_notifications;
