CREATE TABLE IF NOT EXISTS `sp_app_state` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `outlet_id` BIGINT UNSIGNED NOT NULL,
  `state_key` VARCHAR(120) NOT NULL,
  `state_json` LONGTEXT NOT NULL,
  `updated_by` VARCHAR(120) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sp_app_state_outlet_key` (`outlet_id`,`state_key`),
  KEY `idx_sp_app_state_outlet_updated` (`outlet_id`,`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
