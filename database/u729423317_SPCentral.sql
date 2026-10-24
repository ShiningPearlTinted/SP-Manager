-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1:3306
-- Generation Time: Oct 24, 2026 at 06:11 PM
-- Server version: 11.8.9-MariaDB-log
-- PHP Version: 7.2.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `u729423317_SPCentral`
--

-- --------------------------------------------------------

--
-- Table structure for table `api_keys`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `app_settings`
--

CREATE TABLE `app_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `setting_group` varchar(100) NOT NULL,
  `setting_key` varchar(150) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `app_settings`
--


-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

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

--
-- Dumping data for table `audit_logs`
--


-- --------------------------------------------------------

--
-- Table structure for table `backup_records`
--

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

--
-- Dumping data for table `backup_records`
--


-- --------------------------------------------------------

--
-- Table structure for table `car_batteries`
--

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

--
-- Dumping data for table `car_batteries`
--


-- --------------------------------------------------------

--
-- Table structure for table `car_models`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `cash_movements`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `company_settings`
--

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

--
-- Dumping data for table `company_settings`
--


-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

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

--
-- Dumping data for table `customers`
--


-- --------------------------------------------------------

--
-- Table structure for table `customer_displays`
--

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

--
-- Dumping data for table `customer_displays`
--


-- --------------------------------------------------------

--
-- Table structure for table `customer_display_promotions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `customer_display_sessions`
--

CREATE TABLE `customer_display_sessions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `display_code` varchar(64) NOT NULL,
  `terminal_id` varchar(64) NOT NULL,
  `outlet_id` varchar(64) NOT NULL DEFAULT 'SP01',
  `state` varchar(20) NOT NULL DEFAULT 'IDLE',
  `state_json` longtext NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_notes`
--

CREATE TABLE `customer_notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `customer_id` bigint(20) UNSIGNED NOT NULL,
  `note_type` varchar(50) NOT NULL DEFAULT 'GENERAL',
  `note_text` text NOT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `customer_vehicles`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `discount_rules`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `display_events`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `document_counters`
--

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

--
-- Dumping data for table `document_counters`
--


-- --------------------------------------------------------

--
-- Table structure for table `document_payments`
--

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

--
-- Dumping data for table `document_payments`
--


-- --------------------------------------------------------

--
-- Table structure for table `email_settings`
--

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

--
-- Dumping data for table `email_settings`
--


-- --------------------------------------------------------

--
-- Table structure for table `end_of_day`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `hardware_devices`
--

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

--
-- Dumping data for table `hardware_devices`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_attendance`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `hr_claims`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `hr_departments`
--

CREATE TABLE `hr_departments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_departments`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_documents`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `hr_employees`
--

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

--
-- Dumping data for table `hr_employees`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_employment_statuses`
--

CREATE TABLE `hr_employment_statuses` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_active_employment` tinyint(1) NOT NULL DEFAULT 1,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_employment_statuses`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_employment_types`
--

CREATE TABLE `hr_employment_types` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_employment_types`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_leave_requests`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `hr_outlet_history`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `hr_overtime`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `hr_payslips`
--

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

--
-- Dumping data for table `hr_payslips`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_payslip_salary_advances`
--

CREATE TABLE `hr_payslip_salary_advances` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `payslip_id` bigint(20) UNSIGNED NOT NULL,
  `salary_advance_id` bigint(20) UNSIGNED NOT NULL,
  `repayment` decimal(14,2) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_payslip_salary_advances`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_positions`
--

CREATE TABLE `hr_positions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `department_id` bigint(20) UNSIGNED DEFAULT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(150) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `hr_positions`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_salary_advances`
--

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

--
-- Dumping data for table `hr_salary_advances`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_salary_history`
--

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

--
-- Dumping data for table `hr_salary_history`
--


-- --------------------------------------------------------

--
-- Table structure for table `hr_shifts`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `invoices`
--

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

--
-- Dumping data for table `invoices`
--


-- --------------------------------------------------------

--
-- Table structure for table `invoice_items`
--

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

--
-- Dumping data for table `invoice_items`
--


-- --------------------------------------------------------

--
-- Table structure for table `loyalty_accounts`
--

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

--
-- Dumping data for table `loyalty_accounts`
--


-- --------------------------------------------------------

--
-- Table structure for table `loyalty_transactions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `maintenance`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `maintenance_records`
--

CREATE TABLE `maintenance_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `maintenance_id` bigint(20) UNSIGNED NOT NULL,
  `maintenance_date` datetime NOT NULL DEFAULT current_timestamp(),
  `service_description` text DEFAULT NULL,
  `performed_by` varchar(150) DEFAULT NULL,
  `status` varchar(30) NOT NULL DEFAULT 'COMPLETED',
  `notes` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `open_orders`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `open_order_items`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `outlets`
--

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

--
-- Dumping data for table `outlets`
--


-- --------------------------------------------------------

--
-- Table structure for table `outlet_settings`
--

CREATE TABLE `outlet_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `setting_group` varchar(100) NOT NULL,
  `setting_key` varchar(150) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `outlet_settings`
--


-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `payment_types`
--

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

--
-- Dumping data for table `payment_types`
--


-- --------------------------------------------------------

--
-- Table structure for table `payment_type_display_images`
--

CREATE TABLE `payment_type_display_images` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `payment_type_id` bigint(20) UNSIGNED NOT NULL,
  `customer_display_image` longtext DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payment_type_display_images`
--


-- --------------------------------------------------------

--
-- Table structure for table `permissions`
--

CREATE TABLE `permissions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `permission_key` varchar(100) NOT NULL,
  `permission_name` varchar(150) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `permissions`
--


-- --------------------------------------------------------

--
-- Table structure for table `pos_order_context`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `printers`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

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

--
-- Dumping data for table `products`
--


-- --------------------------------------------------------

--
-- Table structure for table `product_barcodes`
--

CREATE TABLE `product_barcodes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `barcode` varchar(150) NOT NULL,
  `barcode_type` varchar(50) DEFAULT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `product_categories`
--

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

--
-- Dumping data for table `product_categories`
--


-- --------------------------------------------------------

--
-- Table structure for table `product_groups`
--

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

--
-- Dumping data for table `product_groups`
--


-- --------------------------------------------------------

--
-- Table structure for table `product_images`
--

CREATE TABLE `product_images` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `image_url` text NOT NULL,
  `image_name` varchar(255) DEFAULT NULL,
  `sort_order` int(11) NOT NULL DEFAULT 0,
  `is_primary` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `product_images`
--


-- --------------------------------------------------------

--
-- Table structure for table `product_outlets`
--

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

--
-- Dumping data for table `product_outlets`
--


-- --------------------------------------------------------

--
-- Table structure for table `product_prices`
--

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

--
-- Dumping data for table `product_prices`
--


-- --------------------------------------------------------

--
-- Table structure for table `promotions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `purchases`
--

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

--
-- Dumping data for table `purchases`
--


-- --------------------------------------------------------

--
-- Table structure for table `purchase_items`
--

CREATE TABLE `purchase_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `purchase_id` bigint(20) UNSIGNED NOT NULL,
  `product_id` bigint(20) UNSIGNED NOT NULL,
  `quantity` decimal(15,3) NOT NULL,
  `unit_cost` decimal(15,2) NOT NULL DEFAULT 0.00,
  `total` decimal(15,2) NOT NULL DEFAULT 0.00,
  `data_json` longtext DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `purchase_items`
--


-- --------------------------------------------------------

--
-- Table structure for table `quotations`
--

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

--
-- Dumping data for table `quotations`
--


-- --------------------------------------------------------

--
-- Table structure for table `quotation_items`
--

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

--
-- Dumping data for table `quotation_items`
--


-- --------------------------------------------------------

--
-- Table structure for table `receipts`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `register_sessions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `roles`
--

CREATE TABLE `roles` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `role_code` varchar(50) NOT NULL,
  `role_name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `roles`
--


-- --------------------------------------------------------

--
-- Table structure for table `role_permissions`
--

CREATE TABLE `role_permissions` (
  `role_id` bigint(20) UNSIGNED NOT NULL,
  `permission_id` bigint(20) UNSIGNED NOT NULL,
  `allowed` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `role_permissions`
--


-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

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

--
-- Dumping data for table `sales`
--


-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

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

--
-- Dumping data for table `sale_items`
--


-- --------------------------------------------------------

--
-- Table structure for table `sale_payments`
--

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

--
-- Dumping data for table `sale_payments`
--


-- --------------------------------------------------------

--
-- Table structure for table `sale_refunds`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `sale_refund_items`
--

CREATE TABLE `sale_refund_items` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `refund_id` bigint(20) UNSIGNED NOT NULL,
  `sale_item_id` bigint(20) UNSIGNED DEFAULT NULL,
  `product_id` bigint(20) UNSIGNED DEFAULT NULL,
  `quantity` decimal(15,3) NOT NULL DEFAULT 0.000,
  `amount` decimal(15,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sale_status_history`
--

CREATE TABLE `sale_status_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED NOT NULL,
  `old_status` varchar(40) DEFAULT NULL,
  `new_status` varchar(40) NOT NULL,
  `reason` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sale_voids`
--

CREATE TABLE `sale_voids` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `sale_id` bigint(20) UNSIGNED NOT NULL,
  `void_reason` text DEFAULT NULL,
  `voided_by` bigint(20) UNSIGNED DEFAULT NULL,
  `voided_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sp_app_state`
--

CREATE TABLE `sp_app_state` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `state_key` varchar(120) NOT NULL,
  `state_json` longtext NOT NULL,
  `updated_by` varchar(120) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sp_app_state`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_bookings`
--

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

--
-- Dumping data for table `sp_bookings`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_booking_bridge_calls`
--

CREATE TABLE `sp_booking_bridge_calls` (
  `call_key` char(64) NOT NULL,
  `site_hash` char(64) NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `action_name` varchar(24) NOT NULL,
  `booking_id` bigint(20) UNSIGNED DEFAULT NULL,
  `response_json` longtext NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sp_booking_bridge_calls`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_booking_events`
--

CREATE TABLE `sp_booking_events` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `booking_id` bigint(20) UNSIGNED NOT NULL,
  `actor_id` bigint(20) UNSIGNED DEFAULT NULL,
  `event_type` varchar(40) NOT NULL,
  `message` varchar(500) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sp_booking_events`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_booking_services`
--

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

--
-- Dumping data for table `sp_booking_services`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_booking_settings`
--

CREATE TABLE `sp_booking_settings` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `settings_json` longtext NOT NULL,
  `version` int(10) UNSIGNED NOT NULL DEFAULT 1,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sp_booking_website_services`
--

CREATE TABLE `sp_booking_website_services` (
  `site_hash` char(64) NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `package_id` bigint(20) UNSIGNED NOT NULL,
  `service_id` bigint(20) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sp_booking_website_services`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_document_counters`
--

CREATE TABLE `sp_document_counters` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `doc_type` varchar(40) NOT NULL,
  `current_number` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `sp_document_counters`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_login_attempts`
--

CREATE TABLE `sp_login_attempts` (
  `bucket_key` char(64) NOT NULL,
  `window_start` bigint(20) NOT NULL,
  `attempts` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `sp_login_attempts`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_relational_sync`
--

CREATE TABLE `sp_relational_sync` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `state_key` varchar(120) NOT NULL,
  `local_id` varchar(190) NOT NULL,
  `entity` varchar(80) NOT NULL,
  `db_id` bigint(20) UNSIGNED NOT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `sp_relational_sync`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_request_receipts`
--

CREATE TABLE `sp_request_receipts` (
  `request_key` char(64) NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `payload_hash` char(64) NOT NULL,
  `response_json` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `sp_request_receipts`
--


-- --------------------------------------------------------

--
-- Table structure for table `sp_settings`
--

CREATE TABLE `sp_settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `setting_key` varchar(150) NOT NULL,
  `setting_value` longtext DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sp_state_versions`
--

CREATE TABLE `sp_state_versions` (
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `state_key` varchar(120) NOT NULL,
  `revision` bigint(20) UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;

--
-- Dumping data for table `sp_state_versions`
--


-- --------------------------------------------------------

--
-- Table structure for table `stock_movements`
--

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

--
-- Dumping data for table `stock_movements`
--


-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

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

--
-- Dumping data for table `suppliers`
--


-- --------------------------------------------------------

--
-- Table structure for table `sync_queue`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `tax_rates`
--

CREATE TABLE `tax_rates` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED DEFAULT NULL,
  `tax_code` varchar(50) NOT NULL,
  `tax_name` varchar(100) NOT NULL,
  `rate` decimal(8,4) NOT NULL DEFAULT 0.0000,
  `inclusive_default` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `terminals`
--

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

--
-- Dumping data for table `terminals`
--


-- --------------------------------------------------------

--
-- Table structure for table `terminal_sessions`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

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

--
-- Dumping data for table `users`
--


-- --------------------------------------------------------

--
-- Table structure for table `user_outlets`
--

CREATE TABLE `user_outlets` (
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `outlet_id` bigint(20) UNSIGNED NOT NULL,
  `is_default` tinyint(1) NOT NULL DEFAULT 0,
  `active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_outlets`
--


-- --------------------------------------------------------

--
-- Table structure for table `warranties`
--

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

-- --------------------------------------------------------

--
-- Table structure for table `warranty_claims`
--

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

--
-- Indexes for dumped tables
--

--
-- Indexes for table `api_keys`
--
ALTER TABLE `api_keys`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_api_key` (`key_hash`),
  ADD KEY `fk_api_key_outlet` (`outlet_id`);

--
-- Indexes for table `app_settings`
--
ALTER TABLE `app_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_app_setting` (`setting_group`,`setting_key`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_audit_outlet_date` (`outlet_id`,`created_at`);

--
-- Indexes for table `backup_records`
--
ALTER TABLE `backup_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_backup_outlet` (`outlet_id`);

--
-- Indexes for table `car_batteries`
--
ALTER TABLE `car_batteries`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_battery_outlet_car` (`outlet_id`,`car_brand`,`model`);

--
-- Indexes for table `car_models`
--
ALTER TABLE `car_models`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_car_model` (`make`,`model`,`variant`);

--
-- Indexes for table `cash_movements`
--
ALTER TABLE `cash_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_cash_outlet_date` (`outlet_id`,`created_at`);

--
-- Indexes for table `company_settings`
--
ALTER TABLE `company_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_company_outlet` (`outlet_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customers_outlet` (`outlet_id`),
  ADD KEY `idx_customers_code` (`code`),
  ADD KEY `idx_customers_phone` (`phone`),
  ADD KEY `idx_customers_email` (`email`);

--
-- Indexes for table `customer_displays`
--
ALTER TABLE `customer_displays`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_display_id` (`display_id`),
  ADD KEY `fk_displays_outlet` (`outlet_id`);

--
-- Indexes for table `customer_display_promotions`
--
ALTER TABLE `customer_display_promotions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_cd_promo_outlet` (`outlet_id`);

--
-- Indexes for table `customer_display_sessions`
--
ALTER TABLE `customer_display_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_customer_display_session_code` (`display_code`);

--
-- Indexes for table `customer_notes`
--
ALTER TABLE `customer_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_notes_customer` (`customer_id`);

--
-- Indexes for table `customer_vehicles`
--
ALTER TABLE `customer_vehicles`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_customer_vehicles_customer` (`customer_id`),
  ADD KEY `idx_customer_vehicles_number` (`vehicle_number`),
  ADD KEY `fk_customer_vehicles_outlet` (`outlet_id`);

--
-- Indexes for table `discount_rules`
--
ALTER TABLE `discount_rules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_discount_outlet` (`outlet_id`);

--
-- Indexes for table `display_events`
--
ALTER TABLE `display_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_display_events_terminal` (`terminal_id`,`created_at`),
  ADD KEY `fk_display_events_outlet` (`outlet_id`),
  ADD KEY `fk_display_events_sale` (`sale_id`);

--
-- Indexes for table `document_counters`
--
ALTER TABLE `document_counters`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_doc_counter` (`outlet_id`,`document_type`);

--
-- Indexes for table `document_payments`
--
ALTER TABLE `document_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_document_payments_outlet` (`outlet_id`),
  ADD KEY `idx_document_payments_quotation` (`quotation_id`),
  ADD KEY `idx_document_payments_invoice` (`invoice_id`),
  ADD KEY `idx_document_payments_customer` (`customer_id`),
  ADD KEY `idx_document_payments_type` (`payment_type_id`);

--
-- Indexes for table `email_settings`
--
ALTER TABLE `email_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_email_outlet` (`outlet_id`);

--
-- Indexes for table `end_of_day`
--
ALTER TABLE `end_of_day`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_eod` (`outlet_id`,`business_date`),
  ADD KEY `fk_eod_register` (`register_session_id`);

--
-- Indexes for table `hardware_devices`
--
ALTER TABLE `hardware_devices`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_hardware_outlet` (`outlet_id`);

--
-- Indexes for table `hr_attendance`
--
ALTER TABLE `hr_attendance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_hr_attendance_outlet_date` (`outlet_id`,`work_date`),
  ADD KEY `ix_hr_attendance_employee` (`employee_id`,`work_date`),
  ADD KEY `fk_hr_attendance_creator` (`created_by`),
  ADD KEY `fk_hr_attendance_editor` (`updated_by`);

--
-- Indexes for table `hr_claims`
--
ALTER TABLE `hr_claims`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD KEY `ix_hr_claims_outlet_status` (`outlet_id`,`status`,`claim_date`),
  ADD KEY `ix_hr_claims_employee` (`employee_id`,`claim_date`),
  ADD KEY `fk_hr_claims_decider` (`decided_by`),
  ADD KEY `fk_hr_claims_payer` (`paid_by`),
  ADD KEY `fk_hr_claims_creator` (`created_by`);

--
-- Indexes for table `hr_departments`
--
ALTER TABLE `hr_departments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `hr_documents`
--
ALTER TABLE `hr_documents`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_hr_documents_employee` (`employee_id`,`created_at`),
  ADD KEY `ix_hr_documents_outlet` (`outlet_id`,`created_at`),
  ADD KEY `fk_hr_documents_uploader` (`uploaded_by`);

--
-- Indexes for table `hr_employees`
--
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

--
-- Indexes for table `hr_employment_statuses`
--
ALTER TABLE `hr_employment_statuses`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `hr_employment_types`
--
ALTER TABLE `hr_employment_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`);

--
-- Indexes for table `hr_leave_requests`
--
ALTER TABLE `hr_leave_requests`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD KEY `ix_hr_leave_outlet_status` (`outlet_id`,`status`,`start_date`),
  ADD KEY `ix_hr_leave_employee` (`employee_id`,`start_date`),
  ADD KEY `fk_hr_leave_decider` (`decided_by`),
  ADD KEY `fk_hr_leave_creator` (`created_by`);

--
-- Indexes for table `hr_outlet_history`
--
ALTER TABLE `hr_outlet_history`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD KEY `ix_hr_history_employee` (`employee_id`,`effective_from`),
  ADD KEY `ix_hr_history_due` (`assignment_kind`,`approval_status`,`effective_from`,`applied_at`),
  ADD KEY `fk_hr_history_previous` (`previous_outlet_id`),
  ADD KEY `fk_hr_history_new` (`new_outlet_id`),
  ADD KEY `fk_hr_history_approver` (`approved_by`),
  ADD KEY `fk_hr_history_creator` (`created_by`);

--
-- Indexes for table `hr_overtime`
--
ALTER TABLE `hr_overtime`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD KEY `ix_hr_overtime_outlet_status` (`outlet_id`,`status`,`work_date`),
  ADD KEY `ix_hr_overtime_employee` (`employee_id`,`work_date`),
  ADD KEY `fk_hr_overtime_decider` (`decided_by`),
  ADD KEY `fk_hr_overtime_creator` (`created_by`);

--
-- Indexes for table `hr_payslips`
--
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

--
-- Indexes for table `hr_payslip_salary_advances`
--
ALTER TABLE `hr_payslip_salary_advances`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_hr_payslip_advance` (`payslip_id`,`salary_advance_id`),
  ADD KEY `ix_hr_payslip_advance_link` (`salary_advance_id`);

--
-- Indexes for table `hr_positions`
--
ALTER TABLE `hr_positions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `code` (`code`),
  ADD KEY `fk_hr_position_department` (`department_id`);

--
-- Indexes for table `hr_salary_advances`
--
ALTER TABLE `hr_salary_advances`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_hr_salary_advance_employee` (`outlet_id`,`employee_id`,`status`,`advance_date`),
  ADD KEY `fk_hr_salary_advance_employee` (`employee_id`),
  ADD KEY `fk_hr_salary_advance_creator` (`created_by`);

--
-- Indexes for table `hr_salary_history`
--
ALTER TABLE `hr_salary_history`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `request_key` (`request_key`),
  ADD UNIQUE KEY `uq_hr_salary_effective` (`employee_id`,`effective_from`),
  ADD KEY `fk_hr_salary_creator` (`created_by`);

--
-- Indexes for table `hr_shifts`
--
ALTER TABLE `hr_shifts`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_hr_shifts_outlet_date` (`outlet_id`,`shift_date`),
  ADD KEY `ix_hr_shifts_employee` (`employee_id`,`shift_date`),
  ADD KEY `fk_hr_shifts_creator` (`created_by`),
  ADD KEY `fk_hr_shifts_editor` (`updated_by`);

--
-- Indexes for table `invoices`
--
ALTER TABLE `invoices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_invoices_outlet_no` (`outlet_id`,`invoice_no`),
  ADD UNIQUE KEY `uq_invoice_quotation` (`outlet_id`,`quotation_id`),
  ADD KEY `fk_invoices_quotation` (`quotation_id`),
  ADD KEY `fk_invoices_sale` (`sale_id`);

--
-- Indexes for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_invoice_items_invoice` (`invoice_id`),
  ADD KEY `fk_invoice_items_product` (`product_id`);

--
-- Indexes for table `loyalty_accounts`
--
ALTER TABLE `loyalty_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_loyalty_customer` (`outlet_id`,`customer_id`);

--
-- Indexes for table `loyalty_transactions`
--
ALTER TABLE `loyalty_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_loyalty_tx_account` (`loyalty_account_id`),
  ADD KEY `fk_loyalty_tx_sale` (`sale_id`);

--
-- Indexes for table `maintenance`
--
ALTER TABLE `maintenance`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_maintenance_outlet` (`outlet_id`),
  ADD KEY `fk_maintenance_sale` (`sale_id`),
  ADD KEY `fk_maintenance_invoice` (`invoice_id`),
  ADD KEY `fk_maintenance_product` (`product_id`);

--
-- Indexes for table `maintenance_records`
--
ALTER TABLE `maintenance_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_maintenance_record` (`maintenance_id`);

--
-- Indexes for table `open_orders`
--
ALTER TABLE `open_orders`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_open_orders_outlet_no` (`outlet_id`,`order_no`);

--
-- Indexes for table `open_order_items`
--
ALTER TABLE `open_order_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_open_item_order` (`open_order_id`),
  ADD KEY `fk_open_item_product` (`product_id`);

--
-- Indexes for table `outlets`
--
ALTER TABLE `outlets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `outlet_code` (`outlet_code`);

--
-- Indexes for table `outlet_settings`
--
ALTER TABLE `outlet_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_outlet_setting` (`outlet_id`,`setting_group`,`setting_key`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_payments_outlet_date` (`outlet_id`,`paid_at`),
  ADD KEY `idx_payments_sale` (`sale_id`);

--
-- Indexes for table `payment_types`
--
ALTER TABLE `payment_types`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payment_type` (`outlet_id`,`payment_code`);

--
-- Indexes for table `payment_type_display_images`
--
ALTER TABLE `payment_type_display_images`
  ADD PRIMARY KEY (`outlet_id`,`payment_type_id`),
  ADD KEY `idx_payment_type_display_images_payment_type` (`payment_type_id`);

--
-- Indexes for table `permissions`
--
ALTER TABLE `permissions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `permission_key` (`permission_key`);

--
-- Indexes for table `pos_order_context`
--
ALTER TABLE `pos_order_context`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_context_sale` (`sale_id`),
  ADD KEY `fk_context_order` (`open_order_id`);

--
-- Indexes for table `printers`
--
ALTER TABLE `printers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_printer_outlet` (`outlet_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_products_outlet` (`outlet_id`),
  ADD KEY `idx_products_barcode` (`barcode`),
  ADD KEY `idx_products_sku` (`sku`),
  ADD KEY `idx_products_group` (`group_id`),
  ADD KEY `fk_products_category` (`category_id`);

--
-- Indexes for table `product_barcodes`
--
ALTER TABLE `product_barcodes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_barcode` (`barcode`),
  ADD KEY `fk_product_barcode_product` (`product_id`);

--
-- Indexes for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pc_outlet` (`outlet_id`);

--
-- Indexes for table `product_groups`
--
ALTER TABLE `product_groups`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_pg_outlet` (`outlet_id`),
  ADD KEY `idx_pg_category` (`category_id`),
  ADD KEY `idx_pg_parent` (`parent_id`);

--
-- Indexes for table `product_images`
--
ALTER TABLE `product_images`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_product_image_product` (`product_id`);

--
-- Indexes for table `product_outlets`
--
ALTER TABLE `product_outlets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_outlet` (`product_id`,`outlet_id`),
  ADD KEY `idx_product_outlets_outlet` (`outlet_id`),
  ADD KEY `idx_product_outlets_product` (`product_id`);

--
-- Indexes for table `product_prices`
--
ALTER TABLE `product_prices`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_product_price` (`outlet_id`,`product_id`,`price_type`),
  ADD KEY `fk_product_price_product` (`product_id`);

--
-- Indexes for table `promotions`
--
ALTER TABLE `promotions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_promotions_outlet` (`outlet_id`),
  ADD KEY `fk_promotions_product` (`product_id`);

--
-- Indexes for table `purchases`
--
ALTER TABLE `purchases`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_purchase_outlet_no` (`outlet_id`,`purchase_no`),
  ADD KEY `fk_purchases_supplier` (`supplier_id`);

--
-- Indexes for table `purchase_items`
--
ALTER TABLE `purchase_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_purchase_items_purchase` (`purchase_id`),
  ADD KEY `fk_purchase_items_product` (`product_id`);

--
-- Indexes for table `quotations`
--
ALTER TABLE `quotations`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_quotations_outlet_no` (`outlet_id`,`quotation_no`);

--
-- Indexes for table `quotation_items`
--
ALTER TABLE `quotation_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_quotation_items_quote` (`quotation_id`),
  ADD KEY `fk_quotation_items_product` (`product_id`);

--
-- Indexes for table `receipts`
--
ALTER TABLE `receipts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_receipt_no` (`outlet_id`,`receipt_no`),
  ADD KEY `fk_receipt_sale` (`sale_id`);

--
-- Indexes for table `register_sessions`
--
ALTER TABLE `register_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_register_outlet` (`outlet_id`);

--
-- Indexes for table `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `role_code` (`role_code`);

--
-- Indexes for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD PRIMARY KEY (`role_id`,`permission_id`),
  ADD KEY `fk_role_permissions_permission` (`permission_id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sales_outlet_no` (`outlet_id`,`sale_no`),
  ADD KEY `idx_sales_date` (`outlet_id`,`sale_date`),
  ADD KEY `idx_sales_customer` (`customer_id`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sale_items_sale` (`sale_id`),
  ADD KEY `idx_sale_items_product` (`product_id`);

--
-- Indexes for table `sale_payments`
--
ALTER TABLE `sale_payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sale_payment_sale` (`sale_id`),
  ADD KEY `fk_sale_payment_type` (`payment_type_id`);

--
-- Indexes for table `sale_refunds`
--
ALTER TABLE `sale_refunds`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_refund_no` (`outlet_id`,`refund_no`),
  ADD KEY `fk_refund_sale` (`original_sale_id`);

--
-- Indexes for table `sale_refund_items`
--
ALTER TABLE `sale_refund_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_refund_item_refund` (`refund_id`),
  ADD KEY `fk_refund_item_sale_item` (`sale_item_id`),
  ADD KEY `fk_refund_item_product` (`product_id`);

--
-- Indexes for table `sale_status_history`
--
ALTER TABLE `sale_status_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sale_status_sale` (`sale_id`);

--
-- Indexes for table `sale_voids`
--
ALTER TABLE `sale_voids`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_void_outlet` (`outlet_id`),
  ADD KEY `fk_void_sale` (`sale_id`);

--
-- Indexes for table `sp_app_state`
--
ALTER TABLE `sp_app_state`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_app_state_outlet_key` (`outlet_id`,`state_key`),
  ADD KEY `idx_sp_app_state_outlet_updated` (`outlet_id`,`updated_at`);

--
-- Indexes for table `sp_bookings`
--
ALTER TABLE `sp_bookings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_booking_reference` (`reference`),
  ADD KEY `ix_sp_bookings_outlet_time` (`outlet_id`,`starts_at`),
  ADD KEY `ix_sp_bookings_capacity` (`outlet_id`,`status`,`starts_at`,`ends_at`),
  ADD KEY `ix_sp_bookings_phone` (`outlet_id`,`phone`),
  ADD KEY `fk_sp_bookings_service` (`service_id`);

--
-- Indexes for table `sp_booking_bridge_calls`
--
ALTER TABLE `sp_booking_bridge_calls`
  ADD PRIMARY KEY (`call_key`),
  ADD KEY `ix_sp_booking_bridge_site_booking` (`site_hash`,`booking_id`),
  ADD KEY `fk_sp_booking_bridge_call_booking` (`booking_id`);

--
-- Indexes for table `sp_booking_events`
--
ALTER TABLE `sp_booking_events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_sp_booking_events_outlet` (`outlet_id`,`id`),
  ADD KEY `fk_sp_booking_events_booking` (`booking_id`);

--
-- Indexes for table `sp_booking_services`
--
ALTER TABLE `sp_booking_services`
  ADD PRIMARY KEY (`id`),
  ADD KEY `ix_sp_booking_services_outlet` (`outlet_id`,`active`);

--
-- Indexes for table `sp_booking_settings`
--
ALTER TABLE `sp_booking_settings`
  ADD PRIMARY KEY (`outlet_id`);

--
-- Indexes for table `sp_booking_website_services`
--
ALTER TABLE `sp_booking_website_services`
  ADD PRIMARY KEY (`site_hash`,`outlet_id`,`package_id`),
  ADD KEY `ix_sp_booking_website_service` (`service_id`),
  ADD KEY `fk_sp_booking_website_outlet` (`outlet_id`);

--
-- Indexes for table `sp_document_counters`
--
ALTER TABLE `sp_document_counters`
  ADD PRIMARY KEY (`outlet_id`,`doc_type`);

--
-- Indexes for table `sp_login_attempts`
--
ALTER TABLE `sp_login_attempts`
  ADD PRIMARY KEY (`bucket_key`);

--
-- Indexes for table `sp_relational_sync`
--
ALTER TABLE `sp_relational_sync`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_rel_sync` (`outlet_id`,`state_key`,`local_id`,`entity`),
  ADD KEY `idx_rel_sync_db` (`outlet_id`,`entity`,`db_id`);

--
-- Indexes for table `sp_request_receipts`
--
ALTER TABLE `sp_request_receipts`
  ADD PRIMARY KEY (`request_key`);

--
-- Indexes for table `sp_settings`
--
ALTER TABLE `sp_settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_sp_settings_outlet_key` (`outlet_id`,`setting_key`);

--
-- Indexes for table `sp_state_versions`
--
ALTER TABLE `sp_state_versions`
  ADD PRIMARY KEY (`outlet_id`,`state_key`);

--
-- Indexes for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sm_outlet` (`outlet_id`),
  ADD KEY `idx_sm_product` (`product_id`),
  ADD KEY `idx_sm_reference` (`reference_type`,`reference_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_suppliers_outlet` (`outlet_id`);

--
-- Indexes for table `sync_queue`
--
ALTER TABLE `sync_queue`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_sync_status` (`outlet_id`,`status`,`created_at`);

--
-- Indexes for table `tax_rates`
--
ALTER TABLE `tax_rates`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_tax` (`outlet_id`,`tax_code`);

--
-- Indexes for table `terminals`
--
ALTER TABLE `terminals`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_terminal_id` (`terminal_id`),
  ADD KEY `fk_terminals_outlet` (`outlet_id`);

--
-- Indexes for table `terminal_sessions`
--
ALTER TABLE `terminal_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_terminal_session_terminal` (`terminal_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_username` (`username`),
  ADD KEY `idx_users_outlet` (`outlet_id`),
  ADD KEY `fk_users_role` (`role_id`);

--
-- Indexes for table `user_outlets`
--
ALTER TABLE `user_outlets`
  ADD PRIMARY KEY (`user_id`,`outlet_id`),
  ADD KEY `fk_user_outlets_outlet` (`outlet_id`);

--
-- Indexes for table `warranties`
--
ALTER TABLE `warranties`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_warranty_outlet` (`outlet_id`),
  ADD KEY `fk_warranty_sale` (`sale_id`),
  ADD KEY `fk_warranty_invoice` (`invoice_id`),
  ADD KEY `fk_warranty_product` (`product_id`);

--
-- Indexes for table `warranty_claims`
--
ALTER TABLE `warranty_claims`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_warranty_claim` (`warranty_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `api_keys`
--
ALTER TABLE `api_keys`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `app_settings`
--
ALTER TABLE `app_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=125;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=953;

--
-- AUTO_INCREMENT for table `backup_records`
--
ALTER TABLE `backup_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `car_batteries`
--
ALTER TABLE `car_batteries`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=848;

--
-- AUTO_INCREMENT for table `car_models`
--
ALTER TABLE `car_models`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `cash_movements`
--
ALTER TABLE `cash_movements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `company_settings`
--
ALTER TABLE `company_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `customer_displays`
--
ALTER TABLE `customer_displays`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `customer_display_promotions`
--
ALTER TABLE `customer_display_promotions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_display_sessions`
--
ALTER TABLE `customer_display_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_notes`
--
ALTER TABLE `customer_notes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `customer_vehicles`
--
ALTER TABLE `customer_vehicles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `discount_rules`
--
ALTER TABLE `discount_rules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `display_events`
--
ALTER TABLE `display_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `document_counters`
--
ALTER TABLE `document_counters`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `document_payments`
--
ALTER TABLE `document_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `email_settings`
--
ALTER TABLE `email_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT for table `end_of_day`
--
ALTER TABLE `end_of_day`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hardware_devices`
--
ALTER TABLE `hardware_devices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `hr_attendance`
--
ALTER TABLE `hr_attendance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hr_claims`
--
ALTER TABLE `hr_claims`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hr_departments`
--
ALTER TABLE `hr_departments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hr_documents`
--
ALTER TABLE `hr_documents`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hr_employees`
--
ALTER TABLE `hr_employees`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hr_employment_statuses`
--
ALTER TABLE `hr_employment_statuses`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hr_employment_types`
--
ALTER TABLE `hr_employment_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hr_leave_requests`
--
ALTER TABLE `hr_leave_requests`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hr_outlet_history`
--
ALTER TABLE `hr_outlet_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hr_overtime`
--
ALTER TABLE `hr_overtime`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hr_payslips`
--
ALTER TABLE `hr_payslips`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hr_payslip_salary_advances`
--
ALTER TABLE `hr_payslip_salary_advances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `hr_positions`
--
ALTER TABLE `hr_positions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hr_salary_advances`
--
ALTER TABLE `hr_salary_advances`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `hr_salary_history`
--
ALTER TABLE `hr_salary_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `hr_shifts`
--
ALTER TABLE `hr_shifts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `invoices`
--
ALTER TABLE `invoices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `invoice_items`
--
ALTER TABLE `invoice_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `loyalty_accounts`
--
ALTER TABLE `loyalty_accounts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=116;

--
-- AUTO_INCREMENT for table `loyalty_transactions`
--
ALTER TABLE `loyalty_transactions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `maintenance`
--
ALTER TABLE `maintenance`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `maintenance_records`
--
ALTER TABLE `maintenance_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `open_orders`
--
ALTER TABLE `open_orders`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `open_order_items`
--
ALTER TABLE `open_order_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `outlets`
--
ALTER TABLE `outlets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `outlet_settings`
--
ALTER TABLE `outlet_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=781;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payment_types`
--
ALTER TABLE `payment_types`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=14;

--
-- AUTO_INCREMENT for table `permissions`
--
ALTER TABLE `permissions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `pos_order_context`
--
ALTER TABLE `pos_order_context`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `printers`
--
ALTER TABLE `printers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `product_barcodes`
--
ALTER TABLE `product_barcodes`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `product_categories`
--
ALTER TABLE `product_categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `product_groups`
--
ALTER TABLE `product_groups`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `product_images`
--
ALTER TABLE `product_images`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=40;

--
-- AUTO_INCREMENT for table `product_outlets`
--
ALTER TABLE `product_outlets`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=75;

--
-- AUTO_INCREMENT for table `product_prices`
--
ALTER TABLE `product_prices`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `promotions`
--
ALTER TABLE `promotions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `purchases`
--
ALTER TABLE `purchases`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `purchase_items`
--
ALTER TABLE `purchase_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=319;

--
-- AUTO_INCREMENT for table `quotations`
--
ALTER TABLE `quotations`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `quotation_items`
--
ALTER TABLE `quotation_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `receipts`
--
ALTER TABLE `receipts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `register_sessions`
--
ALTER TABLE `register_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `roles`
--
ALTER TABLE `roles`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=45;

--
-- AUTO_INCREMENT for table `sale_items`
--
ALTER TABLE `sale_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=35;

--
-- AUTO_INCREMENT for table `sale_payments`
--
ALTER TABLE `sale_payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=21;

--
-- AUTO_INCREMENT for table `sale_refunds`
--
ALTER TABLE `sale_refunds`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sale_refund_items`
--
ALTER TABLE `sale_refund_items`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sale_status_history`
--
ALTER TABLE `sale_status_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sale_voids`
--
ALTER TABLE `sale_voids`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `sp_app_state`
--
ALTER TABLE `sp_app_state`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=318;

--
-- AUTO_INCREMENT for table `sp_bookings`
--
ALTER TABLE `sp_bookings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `sp_booking_events`
--
ALTER TABLE `sp_booking_events`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `sp_booking_services`
--
ALTER TABLE `sp_booking_services`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=53;

--
-- AUTO_INCREMENT for table `sp_relational_sync`
--
ALTER TABLE `sp_relational_sync`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=694;

--
-- AUTO_INCREMENT for table `sp_settings`
--
ALTER TABLE `sp_settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `stock_movements`
--
ALTER TABLE `stock_movements`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=320;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `sync_queue`
--
ALTER TABLE `sync_queue`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `tax_rates`
--
ALTER TABLE `tax_rates`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `terminals`
--
ALTER TABLE `terminals`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `terminal_sessions`
--
ALTER TABLE `terminal_sessions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `warranties`
--
ALTER TABLE `warranties`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `warranty_claims`
--
ALTER TABLE `warranty_claims`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `api_keys`
--
ALTER TABLE `api_keys`
  ADD CONSTRAINT `fk_api_key_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `fk_audit_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `backup_records`
--
ALTER TABLE `backup_records`
  ADD CONSTRAINT `fk_backup_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `cash_movements`
--
ALTER TABLE `cash_movements`
  ADD CONSTRAINT `fk_cash_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `company_settings`
--
ALTER TABLE `company_settings`
  ADD CONSTRAINT `fk_company_settings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customers`
--
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_displays`
--
ALTER TABLE `customer_displays`
  ADD CONSTRAINT `fk_displays_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_display_promotions`
--
ALTER TABLE `customer_display_promotions`
  ADD CONSTRAINT `fk_cd_promo_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_notes`
--
ALTER TABLE `customer_notes`
  ADD CONSTRAINT `fk_customer_notes_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `customer_vehicles`
--
ALTER TABLE `customer_vehicles`
  ADD CONSTRAINT `fk_customer_vehicles_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_customer_vehicles_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `discount_rules`
--
ALTER TABLE `discount_rules`
  ADD CONSTRAINT `fk_discount_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `display_events`
--
ALTER TABLE `display_events`
  ADD CONSTRAINT `fk_display_events_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_display_events_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `document_counters`
--
ALTER TABLE `document_counters`
  ADD CONSTRAINT `fk_doc_counter_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `document_payments`
--
ALTER TABLE `document_payments`
  ADD CONSTRAINT `fk_document_payments_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_document_payments_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`),
  ADD CONSTRAINT `fk_document_payments_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_document_payments_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`),
  ADD CONSTRAINT `fk_document_payments_type` FOREIGN KEY (`payment_type_id`) REFERENCES `payment_types` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `email_settings`
--
ALTER TABLE `email_settings`
  ADD CONSTRAINT `fk_email_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `end_of_day`
--
ALTER TABLE `end_of_day`
  ADD CONSTRAINT `fk_eod_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_eod_register` FOREIGN KEY (`register_session_id`) REFERENCES `register_sessions` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `hardware_devices`
--
ALTER TABLE `hardware_devices`
  ADD CONSTRAINT `fk_hardware_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `hr_attendance`
--
ALTER TABLE `hr_attendance`
  ADD CONSTRAINT `fk_hr_attendance_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_attendance_editor` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_attendance_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_attendance_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `hr_claims`
--
ALTER TABLE `hr_claims`
  ADD CONSTRAINT `fk_hr_claims_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_claims_decider` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_claims_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_claims_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_claims_payer` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `hr_documents`
--
ALTER TABLE `hr_documents`
  ADD CONSTRAINT `fk_hr_documents_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_documents_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_documents_uploader` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `hr_employees`
--
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

--
-- Constraints for table `hr_leave_requests`
--
ALTER TABLE `hr_leave_requests`
  ADD CONSTRAINT `fk_hr_leave_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_leave_decider` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_leave_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_leave_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `hr_outlet_history`
--
ALTER TABLE `hr_outlet_history`
  ADD CONSTRAINT `fk_hr_history_approver` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_history_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_history_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_history_new` FOREIGN KEY (`new_outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_history_previous` FOREIGN KEY (`previous_outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `hr_overtime`
--
ALTER TABLE `hr_overtime`
  ADD CONSTRAINT `fk_hr_overtime_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_overtime_decider` FOREIGN KEY (`decided_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_overtime_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_overtime_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `hr_payslips`
--
ALTER TABLE `hr_payslips`
  ADD CONSTRAINT `fk_hr_payslip_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_issuer` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_salary` FOREIGN KEY (`salary_history_id`) REFERENCES `hr_salary_history` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_salary_advance` FOREIGN KEY (`salary_advance_id`) REFERENCES `hr_salary_advances` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_voider` FOREIGN KEY (`voided_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `hr_payslip_salary_advances`
--
ALTER TABLE `hr_payslip_salary_advances`
  ADD CONSTRAINT `fk_hr_payslip_advance_link_advance` FOREIGN KEY (`salary_advance_id`) REFERENCES `hr_salary_advances` (`id`),
  ADD CONSTRAINT `fk_hr_payslip_advance_link_payslip` FOREIGN KEY (`payslip_id`) REFERENCES `hr_payslips` (`id`);

--
-- Constraints for table `hr_positions`
--
ALTER TABLE `hr_positions`
  ADD CONSTRAINT `fk_hr_position_department` FOREIGN KEY (`department_id`) REFERENCES `hr_departments` (`id`);

--
-- Constraints for table `hr_salary_advances`
--
ALTER TABLE `hr_salary_advances`
  ADD CONSTRAINT `fk_hr_salary_advance_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_salary_advance_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_salary_advance_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `hr_salary_history`
--
ALTER TABLE `hr_salary_history`
  ADD CONSTRAINT `fk_hr_salary_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_salary_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`);

--
-- Constraints for table `hr_shifts`
--
ALTER TABLE `hr_shifts`
  ADD CONSTRAINT `fk_hr_shifts_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_shifts_editor` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_hr_shifts_employee` FOREIGN KEY (`employee_id`) REFERENCES `hr_employees` (`id`),
  ADD CONSTRAINT `fk_hr_shifts_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `invoices`
--
ALTER TABLE `invoices`
  ADD CONSTRAINT `fk_invoices_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_invoices_quotation` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_invoices_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `invoice_items`
--
ALTER TABLE `invoice_items`
  ADD CONSTRAINT `fk_invoice_items_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_invoice_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `loyalty_accounts`
--
ALTER TABLE `loyalty_accounts`
  ADD CONSTRAINT `fk_loyalty_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `loyalty_transactions`
--
ALTER TABLE `loyalty_transactions`
  ADD CONSTRAINT `fk_loyalty_tx_account` FOREIGN KEY (`loyalty_account_id`) REFERENCES `loyalty_accounts` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_loyalty_tx_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `maintenance`
--
ALTER TABLE `maintenance`
  ADD CONSTRAINT `fk_maintenance_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_maintenance_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_maintenance_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_maintenance_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `maintenance_records`
--
ALTER TABLE `maintenance_records`
  ADD CONSTRAINT `fk_maintenance_record` FOREIGN KEY (`maintenance_id`) REFERENCES `maintenance` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `open_orders`
--
ALTER TABLE `open_orders`
  ADD CONSTRAINT `fk_open_orders_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `open_order_items`
--
ALTER TABLE `open_order_items`
  ADD CONSTRAINT `fk_open_item_order` FOREIGN KEY (`open_order_id`) REFERENCES `open_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_open_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `outlet_settings`
--
ALTER TABLE `outlet_settings`
  ADD CONSTRAINT `fk_outlet_setting_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_payments_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payment_types`
--
ALTER TABLE `payment_types`
  ADD CONSTRAINT `fk_payment_type_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `pos_order_context`
--
ALTER TABLE `pos_order_context`
  ADD CONSTRAINT `fk_context_order` FOREIGN KEY (`open_order_id`) REFERENCES `open_orders` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_context_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `printers`
--
ALTER TABLE `printers`
  ADD CONSTRAINT `fk_printer_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_products_group` FOREIGN KEY (`group_id`) REFERENCES `product_groups` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_products_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_barcodes`
--
ALTER TABLE `product_barcodes`
  ADD CONSTRAINT `fk_product_barcode_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_categories`
--
ALTER TABLE `product_categories`
  ADD CONSTRAINT `fk_pc_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_groups`
--
ALTER TABLE `product_groups`
  ADD CONSTRAINT `fk_pg_category` FOREIGN KEY (`category_id`) REFERENCES `product_categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_pg_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_pg_parent` FOREIGN KEY (`parent_id`) REFERENCES `product_groups` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `product_images`
--
ALTER TABLE `product_images`
  ADD CONSTRAINT `fk_product_image_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_outlets`
--
ALTER TABLE `product_outlets`
  ADD CONSTRAINT `fk_product_outlets_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_outlets_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `product_prices`
--
ALTER TABLE `product_prices`
  ADD CONSTRAINT `fk_product_price_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_product_price_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `promotions`
--
ALTER TABLE `promotions`
  ADD CONSTRAINT `fk_promotions_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_promotions_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `purchases`
--
ALTER TABLE `purchases`
  ADD CONSTRAINT `fk_purchases_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_purchases_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `purchase_items`
--
ALTER TABLE `purchase_items`
  ADD CONSTRAINT `fk_purchase_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_purchase_items_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quotations`
--
ALTER TABLE `quotations`
  ADD CONSTRAINT `fk_quotations_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `quotation_items`
--
ALTER TABLE `quotation_items`
  ADD CONSTRAINT `fk_quotation_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_quotation_items_quote` FOREIGN KEY (`quotation_id`) REFERENCES `quotations` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `receipts`
--
ALTER TABLE `receipts`
  ADD CONSTRAINT `fk_receipt_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_receipt_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `register_sessions`
--
ALTER TABLE `register_sessions`
  ADD CONSTRAINT `fk_register_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `role_permissions`
--
ALTER TABLE `role_permissions`
  ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `fk_sales_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  ADD CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sale_payments`
--
ALTER TABLE `sale_payments`
  ADD CONSTRAINT `fk_sale_payment_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sale_payment_type` FOREIGN KEY (`payment_type_id`) REFERENCES `payment_types` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sale_refunds`
--
ALTER TABLE `sale_refunds`
  ADD CONSTRAINT `fk_refund_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_refund_sale` FOREIGN KEY (`original_sale_id`) REFERENCES `sales` (`id`);

--
-- Constraints for table `sale_refund_items`
--
ALTER TABLE `sale_refund_items`
  ADD CONSTRAINT `fk_refund_item_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_refund_item_refund` FOREIGN KEY (`refund_id`) REFERENCES `sale_refunds` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_refund_item_sale_item` FOREIGN KEY (`sale_item_id`) REFERENCES `sale_items` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sale_status_history`
--
ALTER TABLE `sale_status_history`
  ADD CONSTRAINT `fk_sale_status_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sale_voids`
--
ALTER TABLE `sale_voids`
  ADD CONSTRAINT `fk_void_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_void_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`);

--
-- Constraints for table `sp_bookings`
--
ALTER TABLE `sp_bookings`
  ADD CONSTRAINT `fk_sp_bookings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_sp_bookings_service` FOREIGN KEY (`service_id`) REFERENCES `sp_booking_services` (`id`);

--
-- Constraints for table `sp_booking_bridge_calls`
--
ALTER TABLE `sp_booking_bridge_calls`
  ADD CONSTRAINT `fk_sp_booking_bridge_call_booking` FOREIGN KEY (`booking_id`) REFERENCES `sp_bookings` (`id`);

--
-- Constraints for table `sp_booking_events`
--
ALTER TABLE `sp_booking_events`
  ADD CONSTRAINT `fk_sp_booking_events_booking` FOREIGN KEY (`booking_id`) REFERENCES `sp_bookings` (`id`),
  ADD CONSTRAINT `fk_sp_booking_events_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `sp_booking_services`
--
ALTER TABLE `sp_booking_services`
  ADD CONSTRAINT `fk_sp_booking_services_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `sp_booking_settings`
--
ALTER TABLE `sp_booking_settings`
  ADD CONSTRAINT `fk_sp_booking_settings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`);

--
-- Constraints for table `sp_booking_website_services`
--
ALTER TABLE `sp_booking_website_services`
  ADD CONSTRAINT `fk_sp_booking_website_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`),
  ADD CONSTRAINT `fk_sp_booking_website_service` FOREIGN KEY (`service_id`) REFERENCES `sp_booking_services` (`id`);

--
-- Constraints for table `sp_settings`
--
ALTER TABLE `sp_settings`
  ADD CONSTRAINT `fk_sp_settings_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `stock_movements`
--
ALTER TABLE `stock_movements`
  ADD CONSTRAINT `fk_sm_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sm_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD CONSTRAINT `fk_suppliers_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `sync_queue`
--
ALTER TABLE `sync_queue`
  ADD CONSTRAINT `fk_sync_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tax_rates`
--
ALTER TABLE `tax_rates`
  ADD CONSTRAINT `fk_tax_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `terminals`
--
ALTER TABLE `terminals`
  ADD CONSTRAINT `fk_terminals_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `terminal_sessions`
--
ALTER TABLE `terminal_sessions`
  ADD CONSTRAINT `fk_terminal_session_terminal` FOREIGN KEY (`terminal_id`) REFERENCES `terminals` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `user_outlets`
--
ALTER TABLE `user_outlets`
  ADD CONSTRAINT `fk_user_outlets_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_user_outlets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `warranties`
--
ALTER TABLE `warranties`
  ADD CONSTRAINT `fk_warranty_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoices` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_warranty_outlet` FOREIGN KEY (`outlet_id`) REFERENCES `outlets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_warranty_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_warranty_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `warranty_claims`
--
ALTER TABLE `warranty_claims`
  ADD CONSTRAINT `fk_warranty_claim` FOREIGN KEY (`warranty_id`) REFERENCES `warranties` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
