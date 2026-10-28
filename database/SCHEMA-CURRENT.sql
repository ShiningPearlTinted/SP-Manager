-- SP-Manager Central database: current schema (structure only, no data).
-- Generated from the live database dump of 28 Oct 2026 (MariaDB 11.8). Replaces all
-- earlier SCHEMA-EMPTY-*, UPGRADE-* and feature migration files.
-- Import into a NEW, EMPTY database for a fresh install. Do not run on the live database.
-- Collation is normalized to utf8mb4_unicode_ci (live DB: run migrations/collation-normalize-v1.sql).
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
SET NAMES utf8mb4;
START TRANSACTION;


-- Tables

CREATE TABLE `api_keys` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `key_name` varchar(100) NOT NULL,
  `key_hash` varchar(255) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `last_used_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `app_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `setting_group` varchar(100) NOT NULL,
  `setting_key` varchar(150) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `action_name` varchar(100) NOT NULL,
  `entity_type` varchar(100) DEFAULT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `old_data` longtext DEFAULT NULL,
  `new_data` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `backup_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `backup_type` varchar(50) NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `storage_location` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `expires_at` datetime DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'COMPLETED',
  `metadata_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `car_batteries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `car_brand` varchar(100) NOT NULL,
  `model` varchar(180) NOT NULL,
  `size_option1` varchar(64) NOT NULL DEFAULT '-',
  `price_option1` decimal(12,2) NOT NULL DEFAULT 0.00,
  `size_option2` varchar(64) NOT NULL DEFAULT '-',
  `price_option2` decimal(12,2) NOT NULL DEFAULT 0.00,
  `size_option3` varchar(64) NOT NULL DEFAULT '-',
  `price_option3` decimal(12,2) NOT NULL DEFAULT 0.00,
  `size_option4` varchar(64) NOT NULL DEFAULT '-',
  `price_option4` decimal(12,2) NOT NULL DEFAULT 0.00,
  `size_option5` varchar(64) NOT NULL DEFAULT '-',
  `price_option5` decimal(12,2) NOT NULL DEFAULT 0.00,
  `revision` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `car_models` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `make` varchar(120) NOT NULL,
  `model` varchar(150) NOT NULL,
  `variant` varchar(150) DEFAULT NULL,
  `year_from` int(11) DEFAULT NULL,
  `year_to` int(11) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cash_movements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `terminal_id` bigint(20) UNSIGNED DEFAULT NULL,
  `movement_type` varchar(20) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `company_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `company_name` varchar(255) NOT NULL DEFAULT 'Shining Pearl Tinted',
  `registration_no` varchar(150) DEFAULT NULL,
  `tax_number` varchar(150) DEFAULT NULL,
  `phone_number` varchar(80) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `street_name` varchar(255) DEFAULT NULL,
  `building_number` varchar(100) DEFAULT NULL,
  `additional_street_name` varchar(255) DEFAULT NULL,
  `plot_identification` varchar(150) DEFAULT NULL,
  `district` varchar(150) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `city` varchar(150) DEFAULT NULL,
  `state` varchar(150) DEFAULT NULL,
  `country` varchar(100) NOT NULL DEFAULT 'Malaysia',
  `logo_url` text DEFAULT NULL,
  `currency_code` varchar(10) NOT NULL DEFAULT 'MYR',
  `currency_symbol` varchar(10) NOT NULL DEFAULT 'RM',
  `metadata_json` longtext DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `code` varchar(80) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `tax_number` varchar(150) DEFAULT NULL,
  `country` varchar(100) NOT NULL DEFAULT 'Malaysia',
  `street_name` varchar(255) DEFAULT NULL,
  `building_number` varchar(100) DEFAULT NULL,
  `additional_street_name` varchar(255) DEFAULT NULL,
  `plot_identification` varchar(150) DEFAULT NULL,
  `district` varchar(150) DEFAULT NULL,
  `postal_code` varchar(30) DEFAULT NULL,
  `city` varchar(150) DEFAULT NULL,
  `state` varchar(150) DEFAULT NULL,
  `phone` varchar(80) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `vehicle_number` varchar(80) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `is_customer` tinyint(1) NOT NULL DEFAULT 1,
  `is_supplier` tinyint(1) NOT NULL DEFAULT 0,
  `tax_exempt` tinyint(1) NOT NULL DEFAULT 0,
  `discount_percent` decimal(8,2) NOT NULL DEFAULT 0.00,
  `due_date_period` int(11) NOT NULL DEFAULT 0,
  `loyalty_card` varchar(150) DEFAULT NULL,
  `loyalty_points` decimal(15,2) NOT NULL DEFAULT 0.00,
  `visits` int(11) NOT NULL DEFAULT 0,
  `spend` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `metadata_json` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_displays` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `display_id` varchar(80) NOT NULL,
  `display_name` varchar(150) NOT NULL,
  `terminal_id` varchar(80) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `idle_image_url` text DEFAULT NULL,
  `state` varchar(30) NOT NULL DEFAULT 'IDLE',
  `state_json` longtext DEFAULT NULL,
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `image_data` longtext DEFAULT NULL,
  `last_connected` datetime DEFAULT NULL,
  `display_code` varchar(80) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_display_promotions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `display_id` varchar(80) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `image_url` text DEFAULT NULL,
  `video_url` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `metadata_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_display_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `display_code` varchar(64) NOT NULL,
  `terminal_id` varchar(64) NOT NULL,
  `outlet_id` varchar(64) NOT NULL DEFAULT 'SP01',
  `state` varchar(20) NOT NULL DEFAULT 'IDLE',
  `state_json` longtext NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `note_type` varchar(50) NOT NULL DEFAULT 'GENERAL',
  `note_text` text NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_vehicles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `vehicle_number` varchar(80) NOT NULL,
  `make` varchar(120) DEFAULT NULL,
  `model` varchar(150) DEFAULT NULL,
  `variant` varchar(150) DEFAULT NULL,
  `year` int(11) DEFAULT NULL,
  `color` varchar(80) DEFAULT NULL,
  `metadata_json` longtext DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `discount_rules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `discount_name` varchar(150) NOT NULL,
  `discount_type` varchar(30) NOT NULL,
  `value` decimal(15,4) NOT NULL DEFAULT 0.0000,
  `requires_permission` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `display_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `terminal_id` varchar(80) NOT NULL,
  `display_id` varchar(80) DEFAULT NULL,
  `event_type` varchar(50) NOT NULL,
  `sale_id` bigint(20) UNSIGNED DEFAULT NULL,
  `payload_json` longtext NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_counters` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `document_type` varchar(50) NOT NULL,
  `prefix` varchar(50) DEFAULT NULL,
  `next_number` bigint(20) UNSIGNED NOT NULL DEFAULT 1,
  `number_format` varchar(150) DEFAULT NULL,
  `reset_frequency` varchar(30) DEFAULT NULL,
  `last_reset_date` date DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `document_payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `quotation_id` bigint(20) UNSIGNED DEFAULT NULL,
  `invoice_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `payment_type_id` bigint(20) UNSIGNED DEFAULT NULL,
  `payment_type_name` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reference_no` varchar(150) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT current_timestamp(),
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `email_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `smtp_host` varchar(255) DEFAULT NULL,
  `smtp_port` int(11) DEFAULT NULL,
  `encryption` varchar(30) DEFAULT NULL,
  `username` varchar(255) DEFAULT NULL,
  `password_encrypted` text DEFAULT NULL,
  `from_name` varchar(150) DEFAULT NULL,
  `from_email` varchar(255) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `settings_json` longtext DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `end_of_day` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `business_date` date NOT NULL,
  `register_session_id` bigint(20) UNSIGNED DEFAULT NULL,
  `total_sales` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_cash` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total_non_cash` decimal(15,2) NOT NULL DEFAULT 0.00,
  `expected_cash` decimal(15,2) NOT NULL DEFAULT 0.00,
  `actual_cash` decimal(15,2) NOT NULL DEFAULT 0.00,
  `variance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `closed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `report_number` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_transactions` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `report_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hardware_devices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `device_type` varchar(50) NOT NULL,
  `device_name` varchar(150) NOT NULL,
  `connection_type` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `port` varchar(50) DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `settings_json` longtext DEFAULT NULL,
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_attendance` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `work_date` date NOT NULL,
  `clock_in` time DEFAULT NULL,
  `clock_out` time DEFAULT NULL,
  `attendance_status` varchar(20) NOT NULL DEFAULT 'PRESENT',
  `notes` varchar(500) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `updated_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_claims` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `claim_date` date NOT NULL,
  `category` varchar(100) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `description` varchar(1000) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `decision_note` varchar(500) DEFAULT NULL,
  `decided_by` bigint(20) UNSIGNED DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `paid_by` bigint(20) UNSIGNED DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `payment_reference` varchar(120) DEFAULT NULL,
  `receipt_name` varchar(255) DEFAULT NULL,
  `receipt_mime` varchar(100) DEFAULT NULL,
  `receipt_data` mediumblob DEFAULT NULL,
  `request_key` varchar(100) NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_departments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_documents` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `document_type` varchar(80) NOT NULL,
  `title` varchar(180) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_data` mediumblob NOT NULL,
  `uploaded_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_employees` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_uid` char(36) NOT NULL,
  `staff_code` varchar(50) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `primary_outlet_id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `position_id` bigint(20) UNSIGNED DEFAULT NULL,
  `employment_type_id` bigint(20) UNSIGNED NOT NULL,
  `employment_status_id` bigint(20) UNSIGNED NOT NULL,
  `reporting_manager_id` bigint(20) UNSIGNED DEFAULT NULL,
  `full_name` varchar(150) NOT NULL,
  `identity_ciphertext` text DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(50) DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `marital_status` varchar(50) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `emergency_contact_name` varchar(150) DEFAULT NULL,
  `emergency_contact_phone` varchar(50) DEFAULT NULL,
  `emergency_contact_relationship` varchar(80) DEFAULT NULL,
  `photo_storage_key` varchar(255) DEFAULT NULL,
  `join_date` date NOT NULL,
  `confirmation_date` date DEFAULT NULL,
  `contract_start` date DEFAULT NULL,
  `contract_end` date DEFAULT NULL,
  `resignation_date` date DEFAULT NULL,
  `termination_date` date DEFAULT NULL,
  `revision` bigint(20) UNSIGNED NOT NULL DEFAULT 1,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `updated_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_employment_statuses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_active_employment` tinyint(1) NOT NULL DEFAULT 1,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_employment_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_leave_requests` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `leave_type` varchar(60) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `days` decimal(6,2) NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `decision_note` varchar(500) DEFAULT NULL,
  `decided_by` bigint(20) UNSIGNED DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `request_key` varchar(100) NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_outlet_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `assignment_kind` varchar(20) NOT NULL COMMENT 'transfer or temporary; validate server-side',
  `previous_outlet_id` bigint(20) UNSIGNED NOT NULL,
  `new_outlet_id` bigint(20) UNSIGNED NOT NULL,
  `effective_from` date NOT NULL,
  `effective_to` date DEFAULT NULL,
  `approval_status` varchar(20) NOT NULL DEFAULT 'pending',
  `reason` varchar(500) DEFAULT NULL,
  `approved_by` bigint(20) UNSIGNED DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL COMMENT 'Set when primary outlet transfer is applied',
  `request_key` varchar(100) NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_overtime` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `work_date` date NOT NULL,
  `hours` decimal(6,2) NOT NULL,
  `reason` varchar(1000) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `decision_note` varchar(500) DEFAULT NULL,
  `decided_by` bigint(20) UNSIGNED DEFAULT NULL,
  `decided_at` datetime DEFAULT NULL,
  `request_key` varchar(100) NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_payslips` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `payslip_no` varchar(40) DEFAULT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `salary_history_id` bigint(20) UNSIGNED NOT NULL,
  `staff_code_snapshot` varchar(50) NOT NULL,
  `full_name_snapshot` varchar(150) NOT NULL,
  `department_snapshot` varchar(150) DEFAULT NULL,
  `position_snapshot` varchar(150) DEFAULT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `pay_date` date NOT NULL,
  `salary_type` varchar(20) NOT NULL,
  `currency_code` char(3) NOT NULL DEFAULT 'MYR',
  `basic_pay` decimal(14,2) NOT NULL,
  `fixed_allowance` decimal(14,2) NOT NULL DEFAULT 0.00,
  `salary_advance_id` bigint(20) UNSIGNED DEFAULT NULL,
  `salary_advance_repayment` decimal(14,2) NOT NULL DEFAULT 0.00,
  `earnings_json` longtext NOT NULL,
  `deductions_json` longtext NOT NULL,
  `gross_pay` decimal(14,2) NOT NULL,
  `total_deductions` decimal(14,2) NOT NULL,
  `net_pay` decimal(14,2) NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'DRAFT',
  `notes` varchar(1000) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `issued_by` bigint(20) UNSIGNED DEFAULT NULL,
  `issued_at` datetime DEFAULT NULL,
  `voided_by` bigint(20) UNSIGNED DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_payslip_salary_advances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `payslip_id` bigint(20) UNSIGNED NOT NULL,
  `salary_advance_id` bigint(20) UNSIGNED NOT NULL,
  `repayment` decimal(14,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_positions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_salary_advances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `staff_code_snapshot` varchar(50) NOT NULL,
  `full_name_snapshot` varchar(150) NOT NULL,
  `advance_date` date NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `balance` decimal(14,2) NOT NULL,
  `reason` varchar(500) NOT NULL,
  `status` varchar(16) NOT NULL DEFAULT 'OPEN',
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_salary_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `effective_from` date NOT NULL,
  `salary_type` varchar(20) NOT NULL COMMENT 'monthly, daily or hourly; validate server-side',
  `basic_rate` decimal(14,2) NOT NULL,
  `fixed_allowance` decimal(14,2) NOT NULL DEFAULT 0.00,
  `currency_code` char(3) NOT NULL DEFAULT 'MYR',
  `overtime_eligible` tinyint(1) NOT NULL DEFAULT 0,
  `commission_eligible` tinyint(1) NOT NULL DEFAULT 0,
  `statutory_category` varchar(100) DEFAULT NULL,
  `bank_name` varchar(150) DEFAULT NULL,
  `bank_account_ciphertext` text DEFAULT NULL,
  `epf_ciphertext` text DEFAULT NULL,
  `socso_ciphertext` text DEFAULT NULL,
  `tax_ciphertext` text DEFAULT NULL,
  `reason` varchar(500) NOT NULL,
  `request_key` varchar(100) NOT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hr_shifts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `employee_id` bigint(20) UNSIGNED NOT NULL,
  `shift_date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `break_minutes` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  `notes` varchar(500) DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `updated_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `invoice_no` varchar(80) NOT NULL,
  `invoice_date` datetime NOT NULL DEFAULT current_timestamp(),
  `due_date` datetime DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quotation_id` bigint(20) UNSIGNED DEFAULT NULL,
  `sale_id` bigint(20) UNSIGNED DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_status` varchar(30) NOT NULL DEFAULT 'UNPAID',
  `status` varchar(30) NOT NULL DEFAULT 'ISSUED',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `data_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoice_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `invoice_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL DEFAULT 1.000,
  `unit_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `warranty_text` varchar(150) DEFAULT NULL,
  `maintenance_text` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loyalty_accounts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `points_balance` decimal(15,2) NOT NULL DEFAULT 0.00,
  `visits` int(11) NOT NULL DEFAULT 0,
  `total_spend` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tier_name` varchar(100) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `loyalty_transactions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `loyalty_account_id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED DEFAULT NULL,
  `transaction_type` varchar(30) NOT NULL,
  `points` decimal(15,2) NOT NULL DEFAULT 0.00,
  `balance_after` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reason` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `maintenance` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED DEFAULT NULL,
  `invoice_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `maintenance_no` varchar(80) DEFAULT NULL,
  `allowed_times` int(11) DEFAULT NULL,
  `used_times` int(11) NOT NULL DEFAULT 0,
  `status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `maintenance_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `maintenance_id` bigint(20) UNSIGNED NOT NULL,
  `maintenance_date` datetime NOT NULL DEFAULT current_timestamp(),
  `service_description` text DEFAULT NULL,
  `performed_by` varchar(150) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'COMPLETED',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `open_orders` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `order_no` varchar(80) NOT NULL,
  `order_name` varchar(150) DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `data_json` longtext DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `open_order_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `open_order_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `quantity` decimal(15,3) NOT NULL DEFAULT 1.000,
  `unit_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `outlets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_code` varchar(50) NOT NULL,
  `outlet_name` varchar(150) NOT NULL,
  `address` text DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `outlet_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `setting_group` varchar(100) NOT NULL,
  `setting_key` varchar(150) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED NOT NULL,
  `payment_type` varchar(80) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tendered` decimal(15,2) DEFAULT NULL,
  `change_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reference_no` varchar(150) DEFAULT NULL,
  `paid_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `payment_code` varchar(50) NOT NULL,
  `payment_name` varchar(100) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `quick_payment` tinyint(1) NOT NULL DEFAULT 0,
  `customer_required` tinyint(1) NOT NULL DEFAULT 0,
  `change_allowed` tinyint(1) NOT NULL DEFAULT 1,
  `mark_paid` tinyint(1) NOT NULL DEFAULT 1,
  `print_receipt` tinyint(1) NOT NULL DEFAULT 1,
  `open_cash_drawer` tinyint(1) NOT NULL DEFAULT 0,
  `shortcut_key` varchar(30) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `customer_display_image` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payment_type_display_images` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `payment_type_id` bigint(20) UNSIGNED NOT NULL,
  `customer_display_image` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `permission_key` varchar(100) NOT NULL,
  `permission_name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pos_order_context` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED DEFAULT NULL,
  `open_order_id` bigint(20) UNSIGNED DEFAULT NULL,
  `order_name` varchar(150) DEFAULT NULL,
  `comment` text DEFAULT NULL,
  `service_type` varchar(100) DEFAULT NULL,
  `table_name` varchar(100) DEFAULT NULL,
  `floor_name` varchar(100) DEFAULT NULL,
  `metadata_json` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `printers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `printer_name` varchar(150) NOT NULL,
  `printer_type` varchar(50) DEFAULT NULL,
  `connection_type` varchar(50) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `paper_size` varchar(30) DEFAULT NULL,
  `characters_per_line` int(11) DEFAULT NULL,
  `copies` int(11) NOT NULL DEFAULT 1,
  `feed_lines` int(11) NOT NULL DEFAULT 0,
  `cut_paper` tinyint(1) NOT NULL DEFAULT 1,
  `alignment` varchar(30) DEFAULT NULL,
  `code_page` varchar(50) DEFAULT NULL,
  `character_set` varchar(50) DEFAULT NULL,
  `rtl` tinyint(1) NOT NULL DEFAULT 0,
  `rich_formatting` tinyint(1) NOT NULL DEFAULT 0,
  `print_bitmap` tinyint(1) NOT NULL DEFAULT 0,
  `print_barcode` tinyint(1) NOT NULL DEFAULT 0,
  `logo_full_width` tinyint(1) NOT NULL DEFAULT 0,
  `margin_left` decimal(8,2) DEFAULT NULL,
  `margin_right` decimal(8,2) DEFAULT NULL,
  `font_family` varchar(100) DEFAULT NULL,
  `font_size` decimal(8,2) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `settings_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `products` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `group_id` bigint(20) UNSIGNED DEFAULT NULL,
  `sku` varchar(100) DEFAULT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `product_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `cost_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `selling_price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax_rate` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `tax_inclusive` tinyint(1) NOT NULL DEFAULT 0,
  `stock_qty` decimal(15,3) NOT NULL DEFAULT 0.000,
  `min_stock` decimal(15,3) NOT NULL DEFAULT 0.000,
  `unit_name` varchar(50) DEFAULT NULL,
  `is_service` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `allow_price_change` tinyint(1) NOT NULL DEFAULT 0,
  `image_url` text DEFAULT NULL,
  `warranty_years` decimal(5,2) DEFAULT NULL,
  `maintenance_times` int(11) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `metadata_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_barcodes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `barcode` varchar(150) NOT NULL,
  `barcode_type` varchar(50) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `category_code` varchar(50) DEFAULT NULL,
  `category_name` varchar(150) NOT NULL,
  `image_url` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_groups` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `category_id` bigint(20) UNSIGNED DEFAULT NULL,
  `parent_id` bigint(20) UNSIGNED DEFAULT NULL,
  `group_code` varchar(80) DEFAULT NULL,
  `group_name` varchar(150) NOT NULL,
  `image_url` text DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_images` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `image_url` text NOT NULL,
  `image_name` varchar(255) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_outlets` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `selling_price` decimal(15,2) DEFAULT NULL,
  `cost_price` decimal(15,2) DEFAULT NULL,
  `stock_qty` decimal(15,3) NOT NULL DEFAULT 0.000,
  `min_stock` decimal(15,3) NOT NULL DEFAULT 0.000,
  `preferred_quantity` decimal(15,3) NOT NULL DEFAULT 0.000,
  `allow_price_change` tinyint(1) DEFAULT NULL,
  `last_purchase_price` decimal(15,2) DEFAULT NULL,
  `rank` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `product_prices` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `price_type` varchar(50) NOT NULL DEFAULT 'RETAIL',
  `price` decimal(15,2) NOT NULL DEFAULT 0.00,
  `cost_price` decimal(15,2) DEFAULT NULL,
  `effective_from` datetime DEFAULT NULL,
  `effective_to` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `promotions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `promotion_name` varchar(255) NOT NULL,
  `price` decimal(15,2) DEFAULT NULL,
  `discount_percent` decimal(8,2) DEFAULT NULL,
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `data_json` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `purchases` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `supplier_id` bigint(20) UNSIGNED DEFAULT NULL,
  `purchase_no` varchar(80) NOT NULL,
  `purchase_date` datetime NOT NULL DEFAULT current_timestamp(),
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` varchar(30) NOT NULL DEFAULT 'RECEIVED',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `data_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `purchase_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `purchase_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit_cost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `data_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quotations` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `quotation_no` varchar(80) NOT NULL,
  `quotation_date` datetime NOT NULL DEFAULT current_timestamp(),
  `valid_until` datetime DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `status` varchar(30) NOT NULL DEFAULT 'DRAFT',
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `data_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `quotation_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `quotation_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `warranty_text` varchar(150) DEFAULT NULL,
  `maintenance_text` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `receipts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED DEFAULT NULL,
  `receipt_no` varchar(80) NOT NULL,
  `printed_at` datetime DEFAULT NULL,
  `print_count` int(11) NOT NULL DEFAULT 0,
  `printer_name` varchar(150) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `payload_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `register_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `terminal_id` bigint(20) UNSIGNED DEFAULT NULL,
  `opened_by` bigint(20) UNSIGNED DEFAULT NULL,
  `opened_at` datetime NOT NULL DEFAULT current_timestamp(),
  `opening_cash` decimal(15,2) NOT NULL DEFAULT 0.00,
  `closed_by` bigint(20) UNSIGNED DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `closing_cash` decimal(15,2) DEFAULT NULL,
  `expected_cash` decimal(15,2) DEFAULT NULL,
  `variance` decimal(15,2) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `role_code` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sales` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `sale_no` varchar(80) NOT NULL,
  `sale_date` datetime NOT NULL DEFAULT current_timestamp(),
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `order_name` varchar(150) DEFAULT NULL,
  `service_type` varchar(100) DEFAULT NULL,
  `subtotal` decimal(15,2) NOT NULL DEFAULT 0.00,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `payment_status` varchar(30) NOT NULL DEFAULT 'PAID',
  `status` varchar(30) NOT NULL DEFAULT 'COMPLETED',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `notes` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sale_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `discount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tax` decimal(15,2) NOT NULL DEFAULT 0.00,
  `line_total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `warranty_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `warranty_years` int(11) NOT NULL DEFAULT 0,
  `maintenance_enabled` tinyint(1) NOT NULL DEFAULT 0,
  `maintenance_count` int(11) NOT NULL DEFAULT 0,
  `cost_snapshot` decimal(15,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sale_payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED NOT NULL,
  `payment_type_id` bigint(20) UNSIGNED DEFAULT NULL,
  `payment_type_name` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `tendered` decimal(15,2) DEFAULT NULL,
  `change_amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reference_no` varchar(150) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sale_refunds` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `original_sale_id` bigint(20) UNSIGNED NOT NULL,
  `refund_no` varchar(80) NOT NULL,
  `refund_date` datetime NOT NULL DEFAULT current_timestamp(),
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00,
  `reason` text DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'COMPLETED',
  `created_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sale_refund_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `refund_id` bigint(20) UNSIGNED NOT NULL,
  `sale_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL DEFAULT 0.000,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sale_status_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED NOT NULL,
  `old_status` varchar(40) DEFAULT NULL,
  `new_status` varchar(40) NOT NULL,
  `reason` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sale_voids` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED NOT NULL,
  `void_reason` text DEFAULT NULL,
  `voided_by` bigint(20) UNSIGNED DEFAULT NULL,
  `voided_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_app_state` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `state_key` varchar(120) NOT NULL,
  `state_json` longtext NOT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_bookings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `reference` varchar(40) NOT NULL,
  `service_id` bigint(20) UNSIGNED NOT NULL,
  `service_name` varchar(150) NOT NULL,
  `service_category` varchar(24) NOT NULL,
  `description` varchar(500) NOT NULL DEFAULT '',
  `price` decimal(12,2) DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'pending',
  `customer_name` varchar(150) NOT NULL,
  `phone` varchar(32) NOT NULL,
  `email` varchar(190) NOT NULL DEFAULT '',
  `car_model` varchar(150) NOT NULL,
  `plate` varchar(32) NOT NULL,
  `notes` text NOT NULL,
  `source` varchar(24) NOT NULL DEFAULT 'web_app',
  `version` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_booking_bridge_calls` (
  `call_key` char(64) NOT NULL,
  `site_hash` char(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `action_name` varchar(24) NOT NULL,
  `booking_id` bigint(20) UNSIGNED DEFAULT NULL,
  `response_json` longtext NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_booking_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `actor_id` bigint(20) UNSIGNED DEFAULT NULL,
  `event_type` varchar(40) NOT NULL,
  `message` varchar(500) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_booking_services` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(24) NOT NULL,
  `description` varchar(500) NOT NULL DEFAULT '',
  `duration_minutes` smallint(5) UNSIGNED NOT NULL DEFAULT 90,
  `price` decimal(12,2) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `version` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_booking_settings` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `settings_json` longtext NOT NULL,
  `version` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_booking_website_services` (
  `site_hash` char(64) NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `package_id` bigint(20) UNSIGNED NOT NULL,
  `service_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_document_counters` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `doc_type` varchar(40) NOT NULL,
  `current_number` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_label_printing` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(24) NOT NULL,
  `name` varchar(255) NOT NULL DEFAULT '',
  `description` varchar(255) NOT NULL,
  `price` decimal(12,2) NOT NULL DEFAULT 0.00,
  `barcode` varchar(128) NOT NULL DEFAULT '',
  `image_data` mediumtext DEFAULT NULL,
  `display_barcode` tinyint(1) NOT NULL DEFAULT 0,
  `label_width_mm` tinyint(3) UNSIGNED NOT NULL DEFAULT 40,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `updated_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_login_attempts` (
  `bucket_key` char(64) NOT NULL,
  `window_start` bigint(20) NOT NULL,
  `attempts` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `event_key` char(64) NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `event_type` varchar(40) NOT NULL,
  `title` varchar(120) NOT NULL,
  `body` varchar(240) NOT NULL,
  `data_json` longtext NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_notification_deliveries` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `recipient_id` bigint(20) UNSIGNED NOT NULL,
  `subscription_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('PENDING','PROCESSING','SENT','RETRY','EXPIRED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  `attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `next_attempt_at` datetime NOT NULL DEFAULT current_timestamp(),
  `processing_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `last_error_code` varchar(40) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_notification_recipients` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `notification_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_offline_devices` (
  `device_id` char(36) NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `status` enum('ACTIVE','REVOKED') NOT NULL DEFAULT 'ACTIVE',
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_seen_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_offline_stock_quotas` (
  `device_id` char(36) NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `reserved_qty` decimal(14,3) NOT NULL DEFAULT 0.000,
  `consumed_qty` decimal(14,3) NOT NULL DEFAULT 0.000,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_push_subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `endpoint_hash` char(64) NOT NULL,
  `endpoint` text NOT NULL,
  `p256dh` text NOT NULL,
  `auth_secret` text NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `device_label` varchar(180) NOT NULL DEFAULT '',
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `last_used_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_relational_sync` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `state_key` varchar(120) NOT NULL,
  `local_id` varchar(190) NOT NULL,
  `entity` varchar(80) NOT NULL,
  `db_id` bigint(20) UNSIGNED NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_request_receipts` (
  `request_key` char(64) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `response_json` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `setting_key` varchar(150) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sp_state_versions` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `state_key` varchar(120) NOT NULL,
  `revision` bigint(20) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `stock_movements` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `movement_type` varchar(40) NOT NULL,
  `reference_type` varchar(50) DEFAULT NULL,
  `reference_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `stock_before` decimal(15,3) NOT NULL DEFAULT 0.000,
  `stock_after` decimal(15,3) NOT NULL DEFAULT 0.000,
  `unit_cost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `notes` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `reference_no` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `suppliers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `supplier_code` varchar(80) DEFAULT NULL,
  `supplier_name` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `metadata_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sync_queue` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` bigint(20) UNSIGNED DEFAULT NULL,
  `operation_type` varchar(30) NOT NULL,
  `payload_json` longtext DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'PENDING',
  `attempts` int(11) NOT NULL DEFAULT 0,
  `last_error` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `processed_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tax_rates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `tax_code` varchar(50) NOT NULL,
  `tax_name` varchar(100) NOT NULL,
  `rate` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `inclusive_default` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `terminals` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `terminal_id` varchar(80) NOT NULL,
  `terminal_name` varchar(150) NOT NULL,
  `terminal_type` varchar(50) NOT NULL,
  `customer_display_id` varchar(80) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `last_connected_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `terminal_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `terminal_id` bigint(20) UNSIGNED NOT NULL,
  `session_token_hash` varchar(255) DEFAULT NULL,
  `connected_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_seen_at` datetime DEFAULT NULL,
  `disconnected_at` datetime DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'CONNECTED',
  `metadata_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `name` varchar(150) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role_id` bigint(20) UNSIGNED DEFAULT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `permissions_json` longtext DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `session_version` bigint(20) UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_outlets` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `warranties` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED DEFAULT NULL,
  `invoice_id` bigint(20) UNSIGNED DEFAULT NULL,
  `customer_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `warranty_no` varchar(80) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `years` decimal(5,2) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'ACTIVE',
  `notes` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `warranty_claims` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `warranty_id` bigint(20) UNSIGNED NOT NULL,
  `claim_no` varchar(80) DEFAULT NULL,
  `claim_date` datetime NOT NULL DEFAULT current_timestamp(),
  `issue_description` text DEFAULT NULL,
  `action_taken` text DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'OPEN',
  `completed_at` datetime DEFAULT NULL,
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Indexes

ALTER TABLE `api_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_api_key` (`key_hash`),
  ADD KEY `fk_api_key_outlet` (`outlet_id`);

ALTER TABLE `app_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_app_setting` (`setting_group`,`setting_key`);

ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_outlet_date` (`outlet_id`,`created_at`);

ALTER TABLE `backup_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_backup_outlet` (`outlet_id`);

ALTER TABLE `car_batteries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_battery_outlet_car` (`outlet_id`,`car_brand`,`model`);

ALTER TABLE `car_models`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_car_model` (`make`,`model`,`variant`);

ALTER TABLE `cash_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cash_outlet_date` (`outlet_id`,`created_at`);

ALTER TABLE `company_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_company_outlet` (`outlet_id`);

ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customers_outlet` (`outlet_id`),
  ADD KEY `idx_customers_code` (`code`),
  ADD KEY `idx_customers_phone` (`phone`),
  ADD KEY `idx_customers_email` (`email`);

ALTER TABLE `customer_displays`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_display_id` (`display_id`),
  ADD KEY `fk_displays_outlet` (`outlet_id`);

ALTER TABLE `customer_display_promotions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cd_promo_outlet` (`outlet_id`);

ALTER TABLE `customer_display_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customer_display_session_code` (`display_code`);

ALTER TABLE `customer_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_notes_customer` (`customer_id`);

ALTER TABLE `customer_vehicles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_vehicles_customer` (`customer_id`),
  ADD KEY `idx_customer_vehicles_number` (`vehicle_number`),
  ADD KEY `fk_customer_vehicles_outlet` (`outlet_id`);

ALTER TABLE `discount_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_discount_outlet` (`outlet_id`);

ALTER TABLE `display_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_display_events_terminal` (`terminal_id`,`created_at`),
  ADD KEY `fk_display_events_outlet` (`outlet_id`),
  ADD KEY `fk_display_events_sale` (`sale_id`);

ALTER TABLE `document_counters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_doc_counter` (`outlet_id`,`document_type`);

ALTER TABLE `document_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_document_payments_outlet` (`outlet_id`),
  ADD KEY `idx_document_payments_quotation` (`quotation_id`),
  ADD KEY `idx_document_payments_invoice` (`invoice_id`),
  ADD KEY `idx_document_payments_customer` (`customer_id`),
  ADD KEY `idx_document_payments_type` (`payment_type_id`);

ALTER TABLE `email_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_email_outlet` (`outlet_id`);

ALTER TABLE `end_of_day`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_eod` (`outlet_id`,`business_date`),
  ADD KEY `fk_eod_register` (`register_session_id`);

ALTER TABLE `hardware_devices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_hardware_outlet` (`outlet_id`);

ALTER TABLE `hr_attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_hr_attendance_outlet_date` (`outlet_id`,`work_date`),
  ADD KEY `ix_hr_attendance_employee` (`employee_id`,`work_date`),
  ADD KEY `fk_hr_attendance_creator` (`created_by`),
  ADD KEY `fk_hr_attendance_editor` (`updated_by`);

ALTER TABLE `hr_claims`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD KEY `ix_hr_claims_outlet_status` (`outlet_id`,`status`,`claim_date`),
  ADD KEY `ix_hr_claims_employee` (`employee_id`,`claim_date`),
  ADD KEY `fk_hr_claims_decider` (`decided_by`),
  ADD KEY `fk_hr_claims_payer` (`paid_by`),
  ADD KEY `fk_hr_claims_creator` (`created_by`);

ALTER TABLE `hr_departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

ALTER TABLE `hr_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_hr_documents_employee` (`employee_id`,`created_at`),
  ADD KEY `ix_hr_documents_outlet` (`outlet_id`,`created_at`),
  ADD KEY `fk_hr_documents_uploader` (`uploaded_by`);

ALTER TABLE `hr_employees`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `employee_uid` (`employee_uid`),
  ADD UNIQUE KEY `staff_code` (`staff_code`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `ix_hr_employee_outlet_status` (`primary_outlet_id`,`employment_status_id`),
  ADD KEY `ix_hr_employee_department` (`department_id`),
  ADD KEY `ix_hr_employee_name` (`full_name`),
  ADD KEY `ix_hr_employee_contract` (`contract_end`),
  ADD KEY `fk_hr_employee_position` (`position_id`),
  ADD KEY `fk_hr_employee_type` (`employment_type_id`),
  ADD KEY `fk_hr_employee_status` (`employment_status_id`),
  ADD KEY `fk_hr_employee_manager` (`reporting_manager_id`),
  ADD KEY `fk_hr_employee_creator` (`created_by`),
  ADD KEY `fk_hr_employee_editor` (`updated_by`);

ALTER TABLE `hr_employment_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

ALTER TABLE `hr_employment_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

ALTER TABLE `hr_leave_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD KEY `ix_hr_leave_outlet_status` (`outlet_id`,`status`,`start_date`),
  ADD KEY `ix_hr_leave_employee` (`employee_id`,`start_date`),
  ADD KEY `fk_hr_leave_decider` (`decided_by`),
  ADD KEY `fk_hr_leave_creator` (`created_by`);

ALTER TABLE `hr_outlet_history`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD KEY `ix_hr_history_employee` (`employee_id`,`effective_from`),
  ADD KEY `ix_hr_history_due` (`assignment_kind`,`approval_status`,`effective_from`,`applied_at`),
  ADD KEY `fk_hr_history_previous` (`previous_outlet_id`),
  ADD KEY `fk_hr_history_new` (`new_outlet_id`),
  ADD KEY `fk_hr_history_approver` (`approved_by`),
  ADD KEY `fk_hr_history_creator` (`created_by`);

ALTER TABLE `hr_overtime`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD KEY `ix_hr_overtime_outlet_status` (`outlet_id`,`status`,`work_date`),
  ADD KEY `ix_hr_overtime_employee` (`employee_id`,`work_date`),
  ADD KEY `fk_hr_overtime_decider` (`decided_by`),
  ADD KEY `fk_hr_overtime_creator` (`created_by`);

ALTER TABLE `hr_payslips`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `payslip_no` (`payslip_no`),
  ADD KEY `ix_hr_payslip_employee_period` (`outlet_id`,`employee_id`,`period_start`,`period_end`,`status`),
  ADD KEY `ix_hr_payslip_outlet_period` (`outlet_id`,`period_start`,`status`),
  ADD KEY `fk_hr_payslip_employee` (`employee_id`),
  ADD KEY `fk_hr_payslip_salary` (`salary_history_id`),
  ADD KEY `fk_hr_payslip_creator` (`created_by`),
  ADD KEY `fk_hr_payslip_issuer` (`issued_by`),
  ADD KEY `fk_hr_payslip_voider` (`voided_by`),
  ADD KEY `ix_hr_payslip_salary_advance` (`salary_advance_id`);

ALTER TABLE `hr_payslip_salary_advances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_hr_payslip_advance` (`payslip_id`,`salary_advance_id`),
  ADD KEY `ix_hr_payslip_advance_link` (`salary_advance_id`);

ALTER TABLE `hr_positions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `fk_hr_position_department` (`department_id`);

ALTER TABLE `hr_salary_advances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_hr_salary_advance_employee` (`outlet_id`,`employee_id`,`status`,`advance_date`),
  ADD KEY `fk_hr_salary_advance_employee` (`employee_id`),
  ADD KEY `fk_hr_salary_advance_creator` (`created_by`);

ALTER TABLE `hr_salary_history`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD UNIQUE KEY `uq_hr_salary_effective` (`employee_id`,`effective_from`),
  ADD KEY `fk_hr_salary_creator` (`created_by`);

ALTER TABLE `hr_shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_hr_shifts_outlet_date` (`outlet_id`,`shift_date`),
  ADD KEY `ix_hr_shifts_employee` (`employee_id`,`shift_date`),
  ADD KEY `fk_hr_shifts_creator` (`created_by`),
  ADD KEY `fk_hr_shifts_editor` (`updated_by`);

ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_invoices_outlet_no` (`outlet_id`,`invoice_no`),
  ADD UNIQUE KEY `uq_invoice_quotation` (`outlet_id`,`quotation_id`),
  ADD KEY `fk_invoices_quotation` (`quotation_id`),
  ADD KEY `fk_invoices_sale` (`sale_id`);

ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_invoice_items_invoice` (`invoice_id`),
  ADD KEY `fk_invoice_items_product` (`product_id`);

ALTER TABLE `loyalty_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_loyalty_customer` (`outlet_id`,`customer_id`);

ALTER TABLE `loyalty_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_loyalty_tx_account` (`loyalty_account_id`),
  ADD KEY `fk_loyalty_tx_sale` (`sale_id`);

ALTER TABLE `maintenance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_maintenance_outlet` (`outlet_id`),
  ADD KEY `fk_maintenance_sale` (`sale_id`),
  ADD KEY `fk_maintenance_invoice` (`invoice_id`),
  ADD KEY `fk_maintenance_product` (`product_id`);

ALTER TABLE `maintenance_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_maintenance_record` (`maintenance_id`);

ALTER TABLE `open_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_open_orders_outlet_no` (`outlet_id`,`order_no`);

ALTER TABLE `open_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_open_item_order` (`open_order_id`),
  ADD KEY `fk_open_item_product` (`product_id`);

ALTER TABLE `outlets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `outlet_code` (`outlet_code`);

ALTER TABLE `outlet_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_outlet_setting` (`outlet_id`,`setting_group`,`setting_key`);

ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payments_outlet_date` (`outlet_id`,`paid_at`),
  ADD KEY `idx_payments_sale` (`sale_id`);

ALTER TABLE `payment_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payment_type` (`outlet_id`,`payment_code`);

ALTER TABLE `payment_type_display_images`
  ADD PRIMARY KEY (`outlet_id`,`payment_type_id`),
  ADD KEY `idx_payment_type_display_images_payment_type` (`payment_type_id`);

ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `permission_key` (`permission_key`);

ALTER TABLE `pos_order_context`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_context_sale` (`sale_id`),
  ADD KEY `fk_context_order` (`open_order_id`);

ALTER TABLE `printers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_printer_outlet` (`outlet_id`);

ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_products_outlet` (`outlet_id`),
  ADD KEY `idx_products_barcode` (`barcode`),
  ADD KEY `idx_products_sku` (`sku`),
  ADD KEY `idx_products_group` (`group_id`),
  ADD KEY `fk_products_category` (`category_id`);

ALTER TABLE `product_barcodes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_barcode` (`barcode`),
  ADD KEY `fk_product_barcode_product` (`product_id`);

ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pc_outlet` (`outlet_id`);

ALTER TABLE `product_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pg_outlet` (`outlet_id`),
  ADD KEY `idx_pg_category` (`category_id`),
  ADD KEY `idx_pg_parent` (`parent_id`);

ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_product_image_product` (`product_id`);

ALTER TABLE `product_outlets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_outlet` (`product_id`,`outlet_id`),
  ADD KEY `idx_product_outlets_outlet` (`outlet_id`),
  ADD KEY `idx_product_outlets_product` (`product_id`);

ALTER TABLE `product_prices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_price` (`outlet_id`,`product_id`,`price_type`),
  ADD KEY `fk_product_price_product` (`product_id`);

ALTER TABLE `promotions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_promotions_outlet` (`outlet_id`),
  ADD KEY `fk_promotions_product` (`product_id`);

ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_purchase_outlet_no` (`outlet_id`,`purchase_no`),
  ADD KEY `fk_purchases_supplier` (`supplier_id`);

ALTER TABLE `purchase_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_purchase_items_purchase` (`purchase_id`),
  ADD KEY `fk_purchase_items_product` (`product_id`);

ALTER TABLE `quotations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_quotations_outlet_no` (`outlet_id`,`quotation_no`);

ALTER TABLE `quotation_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_quotation_items_quote` (`quotation_id`),
  ADD KEY `fk_quotation_items_product` (`product_id`);

ALTER TABLE `receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_receipt_no` (`outlet_id`,`receipt_no`),
  ADD KEY `fk_receipt_sale` (`sale_id`);

ALTER TABLE `register_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_register_outlet` (`outlet_id`);

ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_code` (`role_code`);

ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_role_permissions_permission` (`permission_id`);

ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sales_outlet_no` (`outlet_id`,`sale_no`),
  ADD KEY `idx_sales_date` (`outlet_id`,`sale_date`),
  ADD KEY `idx_sales_customer` (`customer_id`);

ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sale_items_sale` (`sale_id`),
  ADD KEY `idx_sale_items_product` (`product_id`);

ALTER TABLE `sale_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sale_payment_sale` (`sale_id`),
  ADD KEY `fk_sale_payment_type` (`payment_type_id`);

ALTER TABLE `sale_refunds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_refund_no` (`outlet_id`,`refund_no`),
  ADD KEY `fk_refund_sale` (`original_sale_id`);

ALTER TABLE `sale_refund_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_refund_item_refund` (`refund_id`),
  ADD KEY `fk_refund_item_sale_item` (`sale_item_id`),
  ADD KEY `fk_refund_item_product` (`product_id`);

ALTER TABLE `sale_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sale_status_sale` (`sale_id`);

ALTER TABLE `sale_voids`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_void_outlet` (`outlet_id`),
  ADD KEY `fk_void_sale` (`sale_id`);

ALTER TABLE `sp_app_state`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_app_state_outlet_key` (`outlet_id`,`state_key`),
  ADD KEY `idx_sp_app_state_outlet_updated` (`outlet_id`,`updated_at`);

ALTER TABLE `sp_bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_booking_reference` (`reference`),
  ADD KEY `ix_sp_bookings_outlet_time` (`outlet_id`,`starts_at`),
  ADD KEY `ix_sp_bookings_capacity` (`outlet_id`,`status`,`starts_at`,`ends_at`),
  ADD KEY `ix_sp_bookings_phone` (`outlet_id`,`phone`),
  ADD KEY `fk_sp_bookings_service` (`service_id`);

ALTER TABLE `sp_booking_bridge_calls`
  ADD PRIMARY KEY (`call_key`),
  ADD KEY `ix_sp_booking_bridge_site_booking` (`site_hash`,`booking_id`),
  ADD KEY `fk_sp_booking_bridge_call_booking` (`booking_id`);

ALTER TABLE `sp_booking_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_sp_booking_events_outlet` (`outlet_id`,`id`),
  ADD KEY `fk_sp_booking_events_booking` (`booking_id`);

ALTER TABLE `sp_booking_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_sp_booking_services_outlet` (`outlet_id`,`active`);

ALTER TABLE `sp_booking_settings`
  ADD PRIMARY KEY (`outlet_id`);

ALTER TABLE `sp_booking_website_services`
  ADD PRIMARY KEY (`site_hash`,`outlet_id`,`package_id`),
  ADD KEY `ix_sp_booking_website_service` (`service_id`),
  ADD KEY `fk_sp_booking_website_outlet` (`outlet_id`);

ALTER TABLE `sp_document_counters`
  ADD PRIMARY KEY (`outlet_id`,`doc_type`);

ALTER TABLE `sp_label_printing`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_label_printing_outlet_code` (`outlet_id`,`code`),
  ADD KEY `ix_sp_label_printing_outlet_updated` (`outlet_id`,`updated_at`,`id`),
  ADD KEY `fk_sp_label_printing_created_by` (`created_by`),
  ADD KEY `fk_sp_label_printing_updated_by` (`updated_by`);

ALTER TABLE `sp_login_attempts`
  ADD PRIMARY KEY (`bucket_key`);

ALTER TABLE `sp_notifications`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_notifications_event_key` (`event_key`),
  ADD KEY `ix_sp_notifications_outlet_created` (`outlet_id`,`created_at`,`id`);

ALTER TABLE `sp_notification_deliveries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_notification_delivery_target` (`recipient_id`,`subscription_id`),
  ADD KEY `ix_sp_notification_delivery_due` (`status`,`next_attempt_at`,`id`),
  ADD KEY `fk_sp_notification_delivery_subscription` (`subscription_id`);

ALTER TABLE `sp_notification_recipients`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_notification_recipient` (`notification_id`,`user_id`),
  ADD KEY `ix_sp_notification_recipient_unread` (`user_id`,`read_at`,`notification_id`);

ALTER TABLE `sp_offline_devices`
  ADD PRIMARY KEY (`device_id`),
  ADD KEY `idx_sp_offline_outlet_expiry` (`outlet_id`,`status`,`expires_at`),
  ADD KEY `idx_sp_offline_user` (`user_id`);

ALTER TABLE `sp_offline_stock_quotas`
  ADD PRIMARY KEY (`device_id`,`outlet_id`,`product_id`),
  ADD KEY `idx_sp_offline_quota_stock` (`outlet_id`,`product_id`);

ALTER TABLE `sp_push_subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_push_endpoint_hash` (`endpoint_hash`),
  ADD KEY `ix_sp_push_user_outlet_active` (`user_id`,`outlet_id`,`active`),
  ADD KEY `fk_sp_push_outlet` (`outlet_id`);

ALTER TABLE `sp_relational_sync`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rel_sync` (`outlet_id`,`state_key`,`local_id`,`entity`),
  ADD KEY `idx_rel_sync_db` (`outlet_id`,`entity`,`db_id`);

ALTER TABLE `sp_request_receipts`
  ADD PRIMARY KEY (`request_key`);

ALTER TABLE `sp_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_settings_outlet_key` (`outlet_id`,`setting_key`);

ALTER TABLE `sp_state_versions`
  ADD PRIMARY KEY (`outlet_id`,`state_key`);

ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sm_outlet` (`outlet_id`),
  ADD KEY `idx_sm_product` (`product_id`),
  ADD KEY `idx_sm_reference` (`reference_type`,`reference_id`);

ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_suppliers_outlet` (`outlet_id`);

ALTER TABLE `sync_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sync_status` (`outlet_id`,`status`,`created_at`);

ALTER TABLE `tax_rates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tax` (`outlet_id`,`tax_code`);

ALTER TABLE `terminals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_terminal_id` (`terminal_id`),
  ADD KEY `fk_terminals_outlet` (`outlet_id`);

ALTER TABLE `terminal_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_terminal_session_terminal` (`terminal_id`);

ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_username` (`username`),
  ADD KEY `idx_users_outlet` (`outlet_id`),
  ADD KEY `fk_users_role` (`role_id`);

ALTER TABLE `user_outlets`
  ADD PRIMARY KEY (`user_id`,`outlet_id`),
  ADD KEY `fk_user_outlets_outlet` (`outlet_id`);

ALTER TABLE `warranties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_warranty_outlet` (`outlet_id`),
  ADD KEY `fk_warranty_sale` (`sale_id`),
  ADD KEY `fk_warranty_invoice` (`invoice_id`),
  ADD KEY `fk_warranty_product` (`product_id`);

ALTER TABLE `warranty_claims`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_warranty_claim` (`warranty_id`);

-- AUTO_INCREMENT

ALTER TABLE `api_keys`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `app_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `backup_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `car_batteries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `car_models`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `cash_movements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `company_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `customers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `customer_displays`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `customer_display_promotions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `customer_display_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `customer_notes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `customer_vehicles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `discount_rules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `display_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `document_counters`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `document_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `email_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `end_of_day`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hardware_devices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_attendance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_claims`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_departments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_employees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_employment_statuses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_employment_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_leave_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_outlet_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_overtime`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_payslips`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_payslip_salary_advances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_positions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_salary_advances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_salary_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `hr_shifts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `invoice_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `loyalty_accounts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `loyalty_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `maintenance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `maintenance_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `open_orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `open_order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `outlets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `outlet_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `payment_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `pos_order_context`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `printers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `product_barcodes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `product_categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `product_groups`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `product_images`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `product_outlets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `product_prices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `promotions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `purchases`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `purchase_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `quotations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `quotation_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `receipts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `register_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sales`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sale_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sale_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sale_refunds`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sale_refund_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sale_status_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sale_voids`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_app_state`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_bookings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_booking_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_booking_services`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_label_printing`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_notification_deliveries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_notification_recipients`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_push_subscriptions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_relational_sync`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sp_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `stock_movements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `sync_queue`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `tax_rates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `terminals`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `terminal_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `warranties`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

ALTER TABLE `warranty_claims`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

-- Foreign keys

ALTER TABLE `api_keys`
  ADD CONSTRAINT `fk_api_key_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE SET NULL;

ALTER TABLE `backup_records`
  ADD CONSTRAINT `fk_backup_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `cash_movements`
  ADD CONSTRAINT `fk_cash_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `company_settings`
  ADD CONSTRAINT `fk_company_settings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `customer_displays`
  ADD CONSTRAINT `fk_displays_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `customer_display_promotions`
  ADD CONSTRAINT `fk_cd_promo_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `customer_notes`
  ADD CONSTRAINT `fk_customer_notes_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE;

ALTER TABLE `customer_vehicles`
  ADD CONSTRAINT `fk_customer_vehicles_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_customer_vehicles_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `discount_rules`
  ADD CONSTRAINT `fk_discount_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `display_events`
  ADD CONSTRAINT `fk_display_events_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_display_events_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

ALTER TABLE `document_counters`
  ADD CONSTRAINT `fk_doc_counter_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `document_payments`
  ADD CONSTRAINT `fk_document_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_document_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`),
  ADD CONSTRAINT `fk_document_payments_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_document_payments_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`),
  ADD CONSTRAINT `fk_document_payments_type` FOREIGN KEY (`payment_type_id`) REFERENCES `payment_types` (`id`) ON DELETE SET NULL;

ALTER TABLE `email_settings`
  ADD CONSTRAINT `fk_email_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `end_of_day`
  ADD CONSTRAINT `fk_eod_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_eod_register` FOREIGN KEY (`register_session_id`) REFERENCES `register_sessions` (`id`) ON DELETE SET NULL;

ALTER TABLE `hardware_devices`
  ADD CONSTRAINT `fk_hardware_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `hr_attendance`
  ADD CONSTRAINT `fk_hr_attendance_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_attendance_editor` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_attendance_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `hr_claims`
  ADD CONSTRAINT `fk_hr_claims_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_claims_decider` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_claims_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_claims_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_claims_payer` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`);

ALTER TABLE `hr_documents`
  ADD CONSTRAINT `fk_hr_documents_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_documents_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_documents_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

ALTER TABLE `hr_employees`
  ADD CONSTRAINT `fk_hr_employee_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_employee_department` FOREIGN KEY (`department_id`) REFERENCES `hr_departments` (`id`),
  ADD CONSTRAINT `fk_hr_employee_editor` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_employee_manager` FOREIGN KEY (`reporting_manager_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_employee_outlet` FOREIGN KEY (`primary_outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_employee_position` FOREIGN KEY (`position_id`) REFERENCES `hr_positions` (`id`),
  ADD CONSTRAINT `fk_hr_employee_status` FOREIGN KEY (`employment_status_id`) REFERENCES `hr_employment_statuses` (`id`),
  ADD CONSTRAINT `fk_hr_employee_type` FOREIGN KEY (`employment_type_id`) REFERENCES `hr_employment_types` (`id`),
  ADD CONSTRAINT `fk_hr_employee_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

ALTER TABLE `hr_leave_requests`
  ADD CONSTRAINT `fk_hr_leave_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_leave_decider` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_leave_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `hr_outlet_history`
  ADD CONSTRAINT `fk_hr_history_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_history_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_history_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_history_new` FOREIGN KEY (`new_outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_history_previous` FOREIGN KEY (`previous_outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `hr_overtime`
  ADD CONSTRAINT `fk_hr_overtime_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_overtime_decider` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_overtime_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_overtime_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `hr_payslips`
  ADD CONSTRAINT `fk_hr_payslip_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_issuer` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_salary` FOREIGN KEY (`salary_history_id`) REFERENCES `hr_salary_history` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_salary_advance` FOREIGN KEY (`salary_advance_id`) REFERENCES `hr_salary_advances` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_voider` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`);

ALTER TABLE `hr_payslip_salary_advances`
  ADD CONSTRAINT `fk_hr_payslip_advance_link_advance` FOREIGN KEY (`salary_advance_id`) REFERENCES `hr_salary_advances` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_advance_link_payslip` FOREIGN KEY (`payslip_id`) REFERENCES `hr_payslips` (`id`);

ALTER TABLE `hr_positions`
  ADD CONSTRAINT `fk_hr_position_department` FOREIGN KEY (`department_id`) REFERENCES `hr_departments` (`id`);

ALTER TABLE `hr_salary_advances`
  ADD CONSTRAINT `fk_hr_salary_advance_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_salary_advance_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_salary_advance_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `hr_salary_history`
  ADD CONSTRAINT `fk_hr_salary_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_salary_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`);

ALTER TABLE `hr_shifts`
  ADD CONSTRAINT `fk_hr_shifts_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_shifts_editor` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_shifts_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_shifts_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_invoices_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_invoices_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

ALTER TABLE `invoice_items`
  ADD CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_invoice_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

ALTER TABLE `loyalty_accounts`
  ADD CONSTRAINT `fk_loyalty_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `loyalty_transactions`
  ADD CONSTRAINT `fk_loyalty_tx_account` FOREIGN KEY (`loyalty_account_id`) REFERENCES `loyalty_accounts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_loyalty_tx_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

ALTER TABLE `maintenance`
  ADD CONSTRAINT `fk_maintenance_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_maintenance_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_maintenance_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_maintenance_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

ALTER TABLE `maintenance_records`
  ADD CONSTRAINT `fk_maintenance_record` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance` (`id`) ON DELETE CASCADE;

ALTER TABLE `open_orders`
  ADD CONSTRAINT `fk_open_orders_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `open_order_items`
  ADD CONSTRAINT `fk_open_item_order` FOREIGN KEY (`open_order_id`) REFERENCES `open_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_open_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

ALTER TABLE `outlet_settings`
  ADD CONSTRAINT `fk_outlet_setting_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payments_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

ALTER TABLE `payment_types`
  ADD CONSTRAINT `fk_payment_type_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `pos_order_context`
  ADD CONSTRAINT `fk_context_order` FOREIGN KEY (`open_order_id`) REFERENCES `open_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_context_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

ALTER TABLE `printers`
  ADD CONSTRAINT `fk_printer_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_products_group` FOREIGN KEY (`group_id`) REFERENCES `product_groups` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_products_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `product_barcodes`
  ADD CONSTRAINT `fk_product_barcode_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

ALTER TABLE `product_categories`
  ADD CONSTRAINT `fk_pc_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `product_groups`
  ADD CONSTRAINT `fk_pg_category` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pg_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pg_parent` FOREIGN KEY (`parent_id`) REFERENCES `product_groups` (`id`) ON DELETE SET NULL;

ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_image_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

ALTER TABLE `product_outlets`
  ADD CONSTRAINT `fk_product_outlets_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_outlets_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

ALTER TABLE `product_prices`
  ADD CONSTRAINT `fk_product_price_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_price_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

ALTER TABLE `promotions`
  ADD CONSTRAINT `fk_promotions_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_promotions_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

ALTER TABLE `purchases`
  ADD CONSTRAINT `fk_purchases_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_purchases_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL;

ALTER TABLE `purchase_items`
  ADD CONSTRAINT `fk_purchase_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_purchase_items_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE;

ALTER TABLE `quotations`
  ADD CONSTRAINT `fk_quotations_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `quotation_items`
  ADD CONSTRAINT `fk_quotation_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_quotation_items_quote` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE;

ALTER TABLE `receipts`
  ADD CONSTRAINT `fk_receipt_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_receipt_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

ALTER TABLE `register_sessions`
  ADD CONSTRAINT `fk_register_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

ALTER TABLE `sales`
  ADD CONSTRAINT `fk_sales_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `sale_items`
  ADD CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

ALTER TABLE `sale_payments`
  ADD CONSTRAINT `fk_sale_payment_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sale_payment_type` FOREIGN KEY (`payment_type_id`) REFERENCES `payment_types` (`id`) ON DELETE SET NULL;

ALTER TABLE `sale_refunds`
  ADD CONSTRAINT `fk_refund_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_refund_sale` FOREIGN KEY (`original_sale_id`) REFERENCES `sales` (`id`);

ALTER TABLE `sale_refund_items`
  ADD CONSTRAINT `fk_refund_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_refund_item_refund` FOREIGN KEY (`refund_id`) REFERENCES `sale_refunds` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_refund_item_sale_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE SET NULL;

ALTER TABLE `sale_status_history`
  ADD CONSTRAINT `fk_sale_status_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

ALTER TABLE `sale_voids`
  ADD CONSTRAINT `fk_void_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_void_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`);

ALTER TABLE `sp_bookings`
  ADD CONSTRAINT `fk_sp_bookings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_sp_bookings_service` FOREIGN KEY (`service_id`) REFERENCES `sp_booking_services` (`id`);

ALTER TABLE `sp_booking_bridge_calls`
  ADD CONSTRAINT `fk_sp_booking_bridge_call_booking` FOREIGN KEY (`booking_id`) REFERENCES `sp_bookings` (`id`);

ALTER TABLE `sp_booking_events`
  ADD CONSTRAINT `fk_sp_booking_events_booking` FOREIGN KEY (`booking_id`) REFERENCES `sp_bookings` (`id`),
  ADD CONSTRAINT `fk_sp_booking_events_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `sp_booking_services`
  ADD CONSTRAINT `fk_sp_booking_services_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `sp_booking_settings`
  ADD CONSTRAINT `fk_sp_booking_settings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `sp_booking_website_services`
  ADD CONSTRAINT `fk_sp_booking_website_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_sp_booking_website_service` FOREIGN KEY (`service_id`) REFERENCES `sp_booking_services` (`id`);

ALTER TABLE `sp_label_printing`
  ADD CONSTRAINT `fk_sp_label_printing_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_sp_label_printing_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sp_label_printing_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

ALTER TABLE `sp_notifications`
  ADD CONSTRAINT `fk_sp_notifications_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

ALTER TABLE `sp_notification_deliveries`
  ADD CONSTRAINT `fk_sp_notification_delivery_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `sp_notification_recipients` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sp_notification_delivery_subscription` FOREIGN KEY (`subscription_id`) REFERENCES `sp_push_subscriptions` (`id`) ON DELETE CASCADE;

ALTER TABLE `sp_notification_recipients`
  ADD CONSTRAINT `fk_sp_notification_recipient_event` FOREIGN KEY (`notification_id`) REFERENCES `sp_notifications` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sp_notification_recipient_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `sp_offline_stock_quotas`
  ADD CONSTRAINT `fk_sp_offline_quota_device` FOREIGN KEY (`device_id`) REFERENCES `sp_offline_devices` (`device_id`) ON DELETE CASCADE;

ALTER TABLE `sp_push_subscriptions`
  ADD CONSTRAINT `fk_sp_push_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_sp_push_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `sp_settings`
  ADD CONSTRAINT `fk_sp_settings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_sm_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sm_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

ALTER TABLE `suppliers`
  ADD CONSTRAINT `fk_suppliers_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `sync_queue`
  ADD CONSTRAINT `fk_sync_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `tax_rates`
  ADD CONSTRAINT `fk_tax_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `terminals`
  ADD CONSTRAINT `fk_terminals_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

ALTER TABLE `terminal_sessions`
  ADD CONSTRAINT `fk_terminal_session_terminal` FOREIGN KEY (`terminal_id`) REFERENCES `terminals` (`id`) ON DELETE CASCADE;

ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL;

ALTER TABLE `user_outlets`
  ADD CONSTRAINT `fk_user_outlets_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_outlets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

ALTER TABLE `warranties`
  ADD CONSTRAINT `fk_warranty_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_warranty_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_warranty_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_warranty_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

ALTER TABLE `warranty_claims`
  ADD CONSTRAINT `fk_warranty_claim` FOREIGN KEY (`warranty_id`) REFERENCES `warranties` (`id`) ON DELETE CASCADE;

COMMIT;

SET FOREIGN_KEY_CHECKS = 1;
