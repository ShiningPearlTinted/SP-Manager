-- Additive website bridge metadata. Run AFTER booking-v1.sql.
-- No POS/HR/customer/sales table is modified. Retain records on rollback.
CREATE TABLE IF NOT EXISTS sp_booking_website_services (
 site_hash CHAR(64) NOT NULL,
 outlet_id BIGINT UNSIGNED NOT NULL,
 package_id BIGINT UNSIGNED NOT NULL,
 service_id BIGINT UNSIGNED NOT NULL,
 PRIMARY KEY(site_hash,outlet_id,package_id),
 KEY ix_sp_booking_website_service(service_id),
 CONSTRAINT fk_sp_booking_website_service FOREIGN KEY(service_id) REFERENCES sp_booking_services(id),
 CONSTRAINT fk_sp_booking_website_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS sp_booking_bridge_calls (
 call_key CHAR(64) NOT NULL PRIMARY KEY,
 site_hash CHAR(64) NOT NULL,
 payload_hash CHAR(64) NOT NULL,
 action_name VARCHAR(24) NOT NULL,
 booking_id BIGINT UNSIGNED NULL,
 response_json LONGTEXT NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_sp_booking_bridge_site_booking(site_hash,booking_id),
 CONSTRAINT fk_sp_booking_bridge_call_booking FOREIGN KEY(booking_id) REFERENCES sp_bookings(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
