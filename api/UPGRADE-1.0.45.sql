-- SP-Manager 1.0.45 additive upgrade. Back up first. MariaDB 10.6+/MySQL 8; run once on supplied schema.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version BIGINT UNSIGNED NOT NULL DEFAULT 1;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes LONGTEXT NULL;
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS cost_snapshot DECIMAL(15,2) NULL;
ALTER TABLE customer_displays ADD COLUMN IF NOT EXISTS display_code VARCHAR(80) NULL;
UPDATE customer_displays SET display_code=display_id WHERE display_code IS NULL;
CREATE TABLE IF NOT EXISTS sp_request_receipts (request_key CHAR(64) PRIMARY KEY,user_id BIGINT UNSIGNED NOT NULL,payload_hash CHAR(64) NOT NULL,response_json LONGTEXT NULL,created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS sp_login_attempts (bucket_key CHAR(64) PRIMARY KEY,window_start BIGINT NOT NULL,attempts INT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE TABLE IF NOT EXISTS sp_state_versions (outlet_id BIGINT UNSIGNED NOT NULL,state_key VARCHAR(120) NOT NULL,revision BIGINT UNSIGNED NOT NULL DEFAULT 0,PRIMARY KEY(outlet_id,state_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- Do not backfill historical cost from today's product cost: historical evidence is missing.
