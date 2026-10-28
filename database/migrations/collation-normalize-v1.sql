-- Normalize the 8 tables created with MariaDB 11's default collation
-- (utf8mb4_uca1400_ai_ci) to the collation used by the other 98 tables
-- (utf8mb4_unicode_ci).
--
-- Why: utf8mb4_uca1400_ai_ci does not exist on MySQL 8 or MariaDB < 10.10, so a
-- dump of this database cannot be restored there, and any future JOIN between
-- these tables and the rest of the schema on a text column fails with
-- "Illegal mix of collations".
--
-- Back up first. Each statement rebuilds one small table.
ALTER TABLE customer_display_sessions CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_document_counters      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_login_attempts         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_offline_devices        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_offline_stock_quotas   CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_relational_sync        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_request_receipts       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE sp_state_versions         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
