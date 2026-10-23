-- Additive Booking module. Apply on a backup/staging copy first.
-- No existing POS, stock, HR, customer or sales table is modified.
-- All booking timestamps use Asia/Kuala_Lumpur. MySQL 5.7+/MariaDB 10.2+.
CREATE TABLE IF NOT EXISTS sp_booking_settings (
 outlet_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
 settings_json LONGTEXT NOT NULL,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT fk_sp_booking_settings_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS sp_booking_services (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL,
 name VARCHAR(150) NOT NULL,
 category VARCHAR(24) NOT NULL,
 description VARCHAR(500) NOT NULL DEFAULT '',
 duration_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 90,
 price DECIMAL(12,2) NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_sp_booking_services_outlet(outlet_id,active),
 CONSTRAINT fk_sp_booking_services_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS sp_bookings (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL,
 reference VARCHAR(40) NOT NULL,
 service_id BIGINT UNSIGNED NOT NULL,
 service_name VARCHAR(150) NOT NULL,
 service_category VARCHAR(24) NOT NULL,
 description VARCHAR(500) NOT NULL DEFAULT '',
 price DECIMAL(12,2) NULL,
 starts_at DATETIME NOT NULL,
 ends_at DATETIME NOT NULL,
 status VARCHAR(24) NOT NULL DEFAULT 'pending',
 customer_name VARCHAR(150) NOT NULL,
 phone VARCHAR(32) NOT NULL,
 email VARCHAR(190) NOT NULL DEFAULT '',
 car_model VARCHAR(150) NOT NULL,
 plate VARCHAR(32) NOT NULL,
 notes TEXT NOT NULL,
 source VARCHAR(24) NOT NULL DEFAULT 'web_app',
 version INT UNSIGNED NOT NULL DEFAULT 1,
 created_by BIGINT UNSIGNED NULL,
 updated_by BIGINT UNSIGNED NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_sp_booking_reference(reference),
 KEY ix_sp_bookings_outlet_time(outlet_id,starts_at),
 KEY ix_sp_bookings_capacity(outlet_id,status,starts_at,ends_at),
 KEY ix_sp_bookings_phone(outlet_id,phone),
 CONSTRAINT fk_sp_bookings_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id),
 CONSTRAINT fk_sp_bookings_service FOREIGN KEY(service_id) REFERENCES sp_booking_services(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS sp_booking_events (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL,
 booking_id BIGINT UNSIGNED NOT NULL,
 actor_id BIGINT UNSIGNED NULL,
 event_type VARCHAR(40) NOT NULL,
 message VARCHAR(500) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_sp_booking_events_outlet(outlet_id,id),
 CONSTRAINT fk_sp_booking_events_booking FOREIGN KEY(booking_id) REFERENCES sp_bookings(id),
 CONSTRAINT fk_sp_booking_events_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
