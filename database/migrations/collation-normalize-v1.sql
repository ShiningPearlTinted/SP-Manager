-- Normalize the 8 tables created with MariaDB 11's default collation
-- (utf8mb4_uca1400_ai_ci) to the collation used by the other 98 tables
-- (utf8mb4_unicode_ci).
--
-- Why: utf8mb4_uca1400_ai_ci does not exist on MySQL 8 or MariaDB < 10.10, so a
-- dump of this database cannot be restored there, and any future JOIN between
-- these tables and the rest of the schema on a text column fails with
-- "Illegal mix of collations".
--
-- sp_offline_stock_quotas.device_id has a foreign key to sp_offline_devices.device_id.
-- MariaDB refuses to change the collation of a column used by a foreign key (even with
-- foreign key checks off), so that one key is dropped, both tables are converted, and the
-- identical key is added back. No data is changed.
--
-- Back up first. Each statement rebuilds one small table (under 100 rows each).
-- Safe to run more than once.
SET @OLD_FOREIGN_KEY_CHECKS = @@SESSION.foreign_key_checks;
SET SESSION foreign_key_checks = 0;

ALTER TABLE customer_display_sessions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_document_counters      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_login_attempts         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- MariaDB will not change the collation of device_id while the foreign key exists, even with
-- foreign_key_checks off. Drop it, convert both tables, then add the identical key back.
ALTER TABLE sp_offline_stock_quotas DROP FOREIGN KEY IF EXISTS fk_sp_offline_quota_device;
ALTER TABLE sp_offline_devices        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_offline_stock_quotas   CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_offline_stock_quotas
  ADD CONSTRAINT fk_sp_offline_quota_device FOREIGN KEY IF NOT EXISTS (device_id)
  REFERENCES sp_offline_devices (device_id) ON DELETE CASCADE;
ALTER TABLE sp_relational_sync        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_request_receipts       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_state_versions         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

SET SESSION foreign_key_checks = @OLD_FOREIGN_KEY_CHECKS;

-- Check: every row should show utf8mb4_unicode_ci
SELECT TABLE_NAME, TABLE_COLLATION FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN
('customer_display_sessions','sp_document_counters','sp_login_attempts','sp_offline_devices',
 'sp_offline_stock_quotas','sp_relational_sync','sp_request_receipts','sp_state_versions');
