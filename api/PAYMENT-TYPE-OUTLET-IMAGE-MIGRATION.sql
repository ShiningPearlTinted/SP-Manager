-- Outlet-specific payment display images; safe to run repeatedly.
CREATE TABLE IF NOT EXISTS payment_type_display_images (
 outlet_id BIGINT UNSIGNED NOT NULL,
 payment_type_id BIGINT UNSIGNED NOT NULL,
 customer_display_image LONGTEXT NULL,
 updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (outlet_id,payment_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
