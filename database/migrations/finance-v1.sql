-- Finance module (Profit & Loss, Tax & Zakat).
--
-- sp_finance_entries: income and expenses that are not recorded elsewhere in SP-Manager
--   (rent, utilities, marketing, other income, zakat paid, ...). Sales, cost of goods sold,
--   payslips and staff claims are read from their own tables and are not entered here.
-- sp_finance_tax_settings: the Tax & Zakat inputs for one outlet and one year (entity type,
--   zakat rate, reliefs, ...), stored as JSON.
--
-- Only creates new tables; existing data is not touched. Safe to run more than once.
-- Back up first.

CREATE TABLE IF NOT EXISTS `sp_finance_entries` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `entry_date` date NOT NULL,
  `direction` varchar(3) NOT NULL,
  `category` varchar(80) NOT NULL,
  `details` varchar(255) DEFAULT NULL,
  `amount` decimal(15,2) NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_sp_finance_entries_outlet_date` (`outlet_id`,`entry_date`),
  KEY `idx_sp_finance_entries_category` (`outlet_id`,`category`),
  CONSTRAINT `fk_sp_finance_entries_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_sp_finance_entries_direction` CHECK (`direction` in ('IN','OUT')),
  CONSTRAINT `chk_sp_finance_entries_amount` CHECK (`amount` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sp_finance_tax_settings` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `tax_year` smallint(5) UNSIGNED NOT NULL,
  `data_json` longtext NOT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`outlet_id`,`tax_year`),
  CONSTRAINT `fk_sp_finance_tax_settings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check: both tables should be listed
SHOW TABLES LIKE 'sp_finance_%';
