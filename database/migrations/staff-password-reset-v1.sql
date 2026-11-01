-- Staff password reset (Users & Permissions > Reset password).
--
-- Adds users.must_change_password. An Administrator reset sets it to 1; the user must then choose a
-- new password at the next sign-in, after which it returns to 0.
--
-- Nothing else is needed for this release:
--   * users.password_hash is already VARCHAR(255) and every user already has a password hash;
--   * sign-in attempts are already tracked in sp_login_attempts.
--
-- Adds one column with a default of 0, so existing users are not affected and no data is lost.
-- Safe to run more than once (MariaDB: ADD COLUMN IF NOT EXISTS). Back up first.
-- Run this BEFORE deploying the new API.

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `must_change_password` tinyint(1) NOT NULL DEFAULT 0 AFTER `password_hash`;

-- Check: the column should be listed, and no user should be flagged yet
SHOW COLUMNS FROM `users` LIKE 'must_change_password';
SELECT COUNT(*) AS users_flagged FROM `users` WHERE `must_change_password` = 1;
