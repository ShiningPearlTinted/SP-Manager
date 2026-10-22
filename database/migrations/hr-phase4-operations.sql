-- HR operations modules: attendance, shifts, leave, overtime, claims and encrypted documents.
-- Back up and apply once after hr-phase1.sql, hr-phase3-payslip.sql and hr-phase3-salary-advance.sql.
-- No existing HR, user or outlet records are modified.
CREATE TABLE hr_attendance (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL,
 work_date DATE NOT NULL, clock_in TIME NULL, clock_out TIME NULL,
 attendance_status VARCHAR(20) NOT NULL DEFAULT 'PRESENT', notes VARCHAR(500) NULL,
 created_by BIGINT UNSIGNED NOT NULL, updated_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY ix_hr_attendance_outlet_date(outlet_id,work_date), KEY ix_hr_attendance_employee(employee_id,work_date),
 CONSTRAINT fk_hr_attendance_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_attendance_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_attendance_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_attendance_editor FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_shifts (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL,
 shift_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
 break_minutes SMALLINT UNSIGNED NOT NULL DEFAULT 0, notes VARCHAR(500) NULL,
 created_by BIGINT UNSIGNED NOT NULL, updated_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY ix_hr_shifts_outlet_date(outlet_id,shift_date), KEY ix_hr_shifts_employee(employee_id,shift_date),
 CONSTRAINT fk_hr_shifts_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_shifts_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_shifts_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_shifts_editor FOREIGN KEY(updated_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_leave_requests (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL,
 leave_type VARCHAR(60) NOT NULL, start_date DATE NOT NULL, end_date DATE NOT NULL,
 days DECIMAL(6,2) NOT NULL, reason VARCHAR(1000) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING', decision_note VARCHAR(500) NULL,
 decided_by BIGINT UNSIGNED NULL, decided_at DATETIME NULL,
 request_key VARCHAR(100) NOT NULL UNIQUE,
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_hr_leave_outlet_status(outlet_id,status,start_date), KEY ix_hr_leave_employee(employee_id,start_date),
 CONSTRAINT fk_hr_leave_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_leave_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_leave_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_leave_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_overtime (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL,
 work_date DATE NOT NULL, hours DECIMAL(6,2) NOT NULL, reason VARCHAR(1000) NOT NULL,
 status VARCHAR(20) NOT NULL DEFAULT 'PENDING', decision_note VARCHAR(500) NULL,
 decided_by BIGINT UNSIGNED NULL, decided_at DATETIME NULL,
 request_key VARCHAR(100) NOT NULL UNIQUE,
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_hr_overtime_outlet_status(outlet_id,status,work_date), KEY ix_hr_overtime_employee(employee_id,work_date),
 CONSTRAINT fk_hr_overtime_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_overtime_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_overtime_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_overtime_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_claims (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL,
 claim_date DATE NOT NULL, category VARCHAR(100) NOT NULL, amount DECIMAL(14,2) NOT NULL,
 description VARCHAR(1000) NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
 decision_note VARCHAR(500) NULL, decided_by BIGINT UNSIGNED NULL, decided_at DATETIME NULL,
 paid_by BIGINT UNSIGNED NULL, paid_at DATETIME NULL, payment_reference VARCHAR(120) NULL,
 receipt_name VARCHAR(255) NULL, receipt_mime VARCHAR(100) NULL, receipt_data MEDIUMBLOB NULL,
 request_key VARCHAR(100) NOT NULL UNIQUE,
 created_by BIGINT UNSIGNED NOT NULL, created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_hr_claims_outlet_status(outlet_id,status,claim_date), KEY ix_hr_claims_employee(employee_id,claim_date),
 CONSTRAINT fk_hr_claims_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_claims_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_claims_decider FOREIGN KEY(decided_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_claims_payer FOREIGN KEY(paid_by) REFERENCES users(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_claims_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE hr_documents (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL, employee_id BIGINT UNSIGNED NOT NULL,
 document_type VARCHAR(80) NOT NULL, title VARCHAR(180) NOT NULL,
 file_name VARCHAR(255) NOT NULL, mime_type VARCHAR(100) NOT NULL,
 file_data MEDIUMBLOB NOT NULL, uploaded_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY ix_hr_documents_employee(employee_id,created_at), KEY ix_hr_documents_outlet(outlet_id,created_at),
 CONSTRAINT fk_hr_documents_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_documents_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_documents_uploader FOREIGN KEY(uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
