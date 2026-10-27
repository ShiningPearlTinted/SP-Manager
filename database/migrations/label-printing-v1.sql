-- Additive Label Printing module. Uses the existing Central MySQL database.
-- Apply once after backing up the database; no existing tables are modified.
CREATE TABLE IF NOT EXISTS sp_label_printing (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  outlet_id BIGINT UNSIGNED NOT NULL,
  code VARCHAR(24) NOT NULL,
  description VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  barcode VARCHAR(128) NOT NULL DEFAULT '',
  display_barcode TINYINT(1) NOT NULL DEFAULT 0,
  label_width_mm TINYINT UNSIGNED NOT NULL DEFAULT 40,
  created_by BIGINT UNSIGNED NULL,
  updated_by BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sp_label_printing_outlet_code (outlet_id,code),
  KEY ix_sp_label_printing_outlet_updated (outlet_id,updated_at,id),
  CONSTRAINT fk_sp_label_printing_outlet FOREIGN KEY (outlet_id) REFERENCES outlets(id) ON DELETE CASCADE,
  CONSTRAINT fk_sp_label_printing_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_sp_label_printing_updated_by FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
