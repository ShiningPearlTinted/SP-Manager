-- Phase 1 HR foundation. Verified on an isolated clone; not applied to production.
-- Apply on a verified clone of the supplied central database first.
-- Existing outlets/users ids are BIGINT UNSIGNED. No existing data is modified.
-- DDL auto-commits; back up first. Stop on any error. Do not blindly rerun.
CREATE TABLE hr_departments (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_positions (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 department_id BIGINT UNSIGNED NULL,
 code VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_hr_position_department FOREIGN KEY(department_id) REFERENCES hr_departments(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_employment_types (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_employment_statuses (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 code VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(150) NOT NULL,
 is_active_employment TINYINT(1) NOT NULL DEFAULT 1,
 active TINYINT(1) NOT NULL DEFAULT 1,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_employees (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 employee_uid CHAR(36) NOT NULL UNIQUE,
 staff_code VARCHAR(50) NOT NULL UNIQUE,
 user_id BIGINT UNSIGNED NULL UNIQUE,
 primary_outlet_id BIGINT UNSIGNED NOT NULL,
 department_id BIGINT UNSIGNED NULL,
 position_id BIGINT UNSIGNED NULL,
 employment_type_id BIGINT UNSIGNED NOT NULL,
 employment_status_id BIGINT UNSIGNED NOT NULL,
 reporting_manager_id BIGINT UNSIGNED NULL,
 full_name VARCHAR(150) NOT NULL,
 identity_ciphertext TEXT NULL,
 date_of_birth DATE NULL, gender VARCHAR(50) NULL,
 nationality VARCHAR(100) NULL, marital_status VARCHAR(50) NULL,
 phone VARCHAR(50) NULL, email VARCHAR(150) NULL, address TEXT NULL,
 emergency_contact_name VARCHAR(150) NULL,
 emergency_contact_phone VARCHAR(50) NULL,
 emergency_contact_relationship VARCHAR(80) NULL,
 photo_storage_key VARCHAR(255) NULL,
 join_date DATE NOT NULL, confirmation_date DATE NULL,
 contract_start DATE NULL, contract_end DATE NULL,
 resignation_date DATE NULL, termination_date DATE NULL,
 revision BIGINT UNSIGNED NOT NULL DEFAULT 1,
 created_by BIGINT UNSIGNED NOT NULL,
 updated_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY ix_hr_employee_outlet_status(primary_outlet_id,employment_status_id),
 KEY ix_hr_employee_department(department_id), KEY ix_hr_employee_name(full_name),
 KEY ix_hr_employee_contract(contract_end),
 CONSTRAINT fk_hr_employee_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_employee_outlet FOREIGN KEY(primary_outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_employee_department FOREIGN KEY(department_id) REFERENCES hr_departments(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_employee_position FOREIGN KEY(position_id) REFERENCES hr_positions(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_employee_type FOREIGN KEY(employment_type_id) REFERENCES hr_employment_types(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_employee_status FOREIGN KEY(employment_status_id) REFERENCES hr_employment_statuses(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_employee_manager FOREIGN KEY(reporting_manager_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_employee_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_employee_editor FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_outlet_history (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 employee_id BIGINT UNSIGNED NOT NULL,
 assignment_kind VARCHAR(20) NOT NULL COMMENT 'transfer or temporary; validate server-side',
 previous_outlet_id BIGINT UNSIGNED NOT NULL,
 new_outlet_id BIGINT UNSIGNED NOT NULL,
 effective_from DATE NOT NULL, effective_to DATE NULL,
 approval_status VARCHAR(20) NOT NULL DEFAULT 'pending',
 reason VARCHAR(500) NULL,
 approved_by BIGINT UNSIGNED NULL, approved_at DATETIME NULL,
 applied_at DATETIME NULL COMMENT 'Set when primary outlet transfer is applied',
 request_key VARCHAR(100) NOT NULL UNIQUE,
 created_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_hr_history_employee(employee_id,effective_from),
 KEY ix_hr_history_due(assignment_kind,approval_status,effective_from,applied_at),
 CONSTRAINT fk_hr_history_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_history_previous FOREIGN KEY(previous_outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_history_new FOREIGN KEY(new_outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_history_approver FOREIGN KEY(approved_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_history_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_salary_history (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 employee_id BIGINT UNSIGNED NOT NULL,
 effective_from DATE NOT NULL,
 salary_type VARCHAR(20) NOT NULL COMMENT 'monthly, daily or hourly; validate server-side',
 basic_rate DECIMAL(14,2) NOT NULL,
 fixed_allowance DECIMAL(14,2) NOT NULL DEFAULT 0,
 currency_code CHAR(3) NOT NULL DEFAULT 'MYR',
 overtime_eligible TINYINT(1) NOT NULL DEFAULT 0,
 commission_eligible TINYINT(1) NOT NULL DEFAULT 0,
 statutory_category VARCHAR(100) NULL,
 bank_name VARCHAR(150) NULL, bank_account_ciphertext TEXT NULL,
 epf_ciphertext TEXT NULL, socso_ciphertext TEXT NULL, tax_ciphertext TEXT NULL,
 reason VARCHAR(500) NOT NULL,
 request_key VARCHAR(100) NOT NULL UNIQUE,
 created_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_hr_salary_effective(employee_id,effective_from),
 CONSTRAINT fk_hr_salary_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_salary_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- Deliberately no permission/user grants, master seeds or production rates.
-- Existing permission runtime uses users.permissions_json; integration adds labels
-- and explicit grants through existing Users & Permissions after approval.
-- API must validate amounts, date order, assignment overlap, same-outlet transfer,
-- manager cycles, immutable employee_uid, sensitive field access and row revisions.
-- Future attendance/payroll store their own outlet and salary snapshots.
-- Recovery guidance: see HR-AUDIT-PHASE1.md. Do not drop tables containing HR data.

