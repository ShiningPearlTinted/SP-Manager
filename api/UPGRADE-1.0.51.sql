-- Additive only. Import once into the existing SP-Manager database.
CREATE TABLE IF NOT EXISTS car_batteries (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
 outlet_id BIGINT UNSIGNED NOT NULL,
 car_brand VARCHAR(100) NOT NULL,
 model VARCHAR(180) NOT NULL,
 size_option1 VARCHAR(64) NOT NULL DEFAULT '-',
 price_option1 DECIMAL(12,2) NOT NULL DEFAULT 0,
 size_option2 VARCHAR(64) NOT NULL DEFAULT '-',
 price_option2 DECIMAL(12,2) NOT NULL DEFAULT 0,
 size_option3 VARCHAR(64) NOT NULL DEFAULT '-',
 price_option3 DECIMAL(12,2) NOT NULL DEFAULT 0,
 size_option4 VARCHAR(64) NOT NULL DEFAULT '-',
 price_option4 DECIMAL(12,2) NOT NULL DEFAULT 0,
 size_option5 VARCHAR(64) NOT NULL DEFAULT '-',
 price_option5 DECIMAL(12,2) NOT NULL DEFAULT 0,
 revision INT UNSIGNED NOT NULL DEFAULT 1,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (id),
 UNIQUE KEY uq_battery_outlet_car (outlet_id,car_brand,model)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Outlet-specific payment display images; safe to run repeatedly.
CREATE TABLE IF NOT EXISTS payment_type_display_images (
 outlet_id BIGINT UNSIGNED NOT NULL,
 payment_type_id BIGINT UNSIGNED NOT NULL,
 customer_display_image LONGTEXT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (outlet_id,payment_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Retain the legacy master image column for compatible backup restore.
ALTER TABLE payment_types ADD COLUMN IF NOT EXISTS customer_display_image LONGTEXT NULL AFTER sort_order;
