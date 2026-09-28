-- SP-Manager Settings V3 - additive / non-destructive
-- The API also creates these tables automatically when missing.
CREATE TABLE IF NOT EXISTS app_settings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 setting_group VARCHAR(100) NOT NULL,
 setting_key VARCHAR(150) NOT NULL,
 setting_value LONGTEXT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_app_setting(setting_group,setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS outlet_settings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL,
 setting_group VARCHAR(100) NOT NULL,
 setting_key VARCHAR(150) NOT NULL,
 setting_value LONGTEXT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_outlet_setting(outlet_id,setting_group,setting_key),
 CONSTRAINT fk_outlet_setting_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_settings (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NULL,
 smtp_host VARCHAR(255) NULL,
 smtp_port INT NULL,
 encryption VARCHAR(30) NULL,
 username VARCHAR(255) NULL,
 password_encrypted TEXT NULL,
 from_name VARCHAR(150) NULL,
 from_email VARCHAR(255) NULL,
 enabled TINYINT(1) NOT NULL DEFAULT 0,
 settings_json LONGTEXT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 UNIQUE KEY uq_email_outlet(outlet_id),
 CONSTRAINT fk_email_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS printers (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NULL,
 printer_name VARCHAR(150) NOT NULL,
 printer_type VARCHAR(50) NULL,
 connection_type VARCHAR(50) NULL,
 address VARCHAR(255) NULL,
 paper_size VARCHAR(30) NULL,
 characters_per_line INT NULL,
 copies INT NOT NULL DEFAULT 1,
 feed_lines INT NOT NULL DEFAULT 0,
 cut_paper TINYINT(1) NOT NULL DEFAULT 1,
 alignment VARCHAR(30) NULL,
 code_page VARCHAR(50) NULL,
 character_set VARCHAR(50) NULL,
 rtl TINYINT(1) NOT NULL DEFAULT 0,
 rich_formatting TINYINT(1) NOT NULL DEFAULT 0,
 print_bitmap TINYINT(1) NOT NULL DEFAULT 0,
 print_barcode TINYINT(1) NOT NULL DEFAULT 0,
 logo_full_width TINYINT(1) NOT NULL DEFAULT 0,
 margin_left DECIMAL(8,2) NULL,
 margin_right DECIMAL(8,2) NULL,
 font_family VARCHAR(100) NULL,
 font_size DECIMAL(8,2) NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 settings_json LONGTEXT NULL,
 CONSTRAINT fk_printer_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hardware_devices (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NULL,
 device_type VARCHAR(50) NOT NULL,
 device_name VARCHAR(150) NOT NULL,
 connection_type VARCHAR(50) NULL,
 address VARCHAR(255) NULL,
 port VARCHAR(50) NULL,
 enabled TINYINT(1) NOT NULL DEFAULT 1,
 settings_json LONGTEXT NULL,
 last_seen_at DATETIME NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_hardware_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS backup_records (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NULL,
 backup_type VARCHAR(50) NOT NULL,
 file_name VARCHAR(255) NULL,
 storage_location TEXT NULL,
 created_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 expires_at DATETIME NULL,
 status VARCHAR(30) NOT NULL DEFAULT 'COMPLETED',
 metadata_json LONGTEXT NULL,
 CONSTRAINT fk_backup_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
