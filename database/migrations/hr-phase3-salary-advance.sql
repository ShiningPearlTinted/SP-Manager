-- HR Phase 3 add-on: salary advances and payslip repayments.
-- Apply once after hr-phase3-payslip.sql. Back up and use staging first.
CREATE TABLE hr_salary_advances (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 outlet_id BIGINT UNSIGNED NOT NULL,
 employee_id BIGINT UNSIGNED NOT NULL,
 staff_code_snapshot VARCHAR(50) NOT NULL,
 full_name_snapshot VARCHAR(150) NOT NULL,
 advance_date DATE NOT NULL,
 amount DECIMAL(14,2) NOT NULL,
 balance DECIMAL(14,2) NOT NULL,
 reason VARCHAR(500) NOT NULL,
 status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
 created_by BIGINT UNSIGNED NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 KEY ix_hr_salary_advance_employee(outlet_id,employee_id,status,advance_date),
 CONSTRAINT fk_hr_salary_advance_outlet FOREIGN KEY(outlet_id) REFERENCES outlets(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_salary_advance_employee FOREIGN KEY(employee_id) REFERENCES hr_employees(id) ON DELETE RESTRICT,
 CONSTRAINT fk_hr_salary_advance_creator FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
ALTER TABLE hr_payslips
 ADD COLUMN salary_advance_id BIGINT UNSIGNED NULL AFTER fixed_allowance,
 ADD COLUMN salary_advance_repayment DECIMAL(14,2) NOT NULL DEFAULT 0 AFTER salary_advance_id,
 ADD KEY ix_hr_payslip_salary_advance(salary_advance_id),
 ADD CONSTRAINT fk_hr_payslip_salary_advance FOREIGN KEY(salary_advance_id) REFERENCES hr_salary_advances(id) ON DELETE RESTRICT;
