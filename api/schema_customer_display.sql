-- Compatible with customer-display.php and the current outlet/terminal schema.
-- Run after the core application schema has created outlets(id).
CREATE TABLE IF NOT EXISTS terminals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  outlet_id BIGINT UNSIGNED NOT NULL,
  terminal_id VARCHAR(80) NOT NULL,
  terminal_name VARCHAR(150) NOT NULL,
  terminal_type VARCHAR(50) NOT NULL,
  customer_display_id VARCHAR(80) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  last_connected_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_terminal_id (terminal_id),
  KEY idx_terminals_outlet (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_displays (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  display_id VARCHAR(80) NOT NULL,
  display_code VARCHAR(80) NULL,
  display_name VARCHAR(150) NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  terminal_id VARCHAR(80) NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  state VARCHAR(20) NOT NULL DEFAULT 'IDLE',
  state_json LONGTEXT NULL,
  last_seen_at DATETIME NULL,
  status ENUM('Connected','Disconnected','Inactive') NOT NULL DEFAULT 'Disconnected',
  last_connected DATETIME NULL,
  idle_image_url TEXT NULL,
  image_data LONGTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uq_customer_display_id (display_id), UNIQUE KEY uq_display_code (display_code), KEY idx_display_terminal (terminal_id), KEY idx_display_outlet (outlet_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_display_sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  display_code VARCHAR(80) NOT NULL,
  terminal_id VARCHAR(80) NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  state ENUM('IDLE','CART','PAYMENT','COMPLETED','ERROR') NOT NULL DEFAULT 'IDLE',
  state_json LONGTEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  expires_at DATETIME NULL,
  PRIMARY KEY (id), UNIQUE KEY uq_display_session (display_code), KEY idx_terminal (terminal_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
