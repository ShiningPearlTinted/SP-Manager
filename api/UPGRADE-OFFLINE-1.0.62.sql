CREATE TABLE IF NOT EXISTS sp_offline_devices (
  device_id CHAR(36) NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  status ENUM('ACTIVE','REVOKED') NOT NULL DEFAULT 'ACTIVE',
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NULL,
  PRIMARY KEY (device_id),
  KEY idx_sp_offline_outlet_expiry (outlet_id,status,expires_at),
  KEY idx_sp_offline_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sp_offline_stock_quotas (
  device_id CHAR(36) NOT NULL,
  outlet_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  reserved_qty DECIMAL(14,3) NOT NULL DEFAULT 0,
  consumed_qty DECIMAL(14,3) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (device_id,outlet_id,product_id),
  KEY idx_sp_offline_quota_stock (outlet_id,product_id),
  CONSTRAINT fk_sp_offline_quota_device FOREIGN KEY (device_id) REFERENCES sp_offline_devices(device_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
