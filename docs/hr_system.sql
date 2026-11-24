CREATE DATABASE IF NOT EXISTS hr_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
USE hr_system;

CREATE TABLE IF NOT EXISTS departments (
  department_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_name VARCHAR(120) NOT NULL,
  department_head_id INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (department_id),
  UNIQUE KEY uq_departments_name (department_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
  employee_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id INT UNSIGNED NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  token_version INT UNSIGNED NOT NULL DEFAULT 0,
  role ENUM('Employee', 'DepartmentHead', 'HRManager') NOT NULL DEFAULT 'Employee',
  position VARCHAR(120) NOT NULL,
  date_hired DATE NOT NULL,
  employment_status VARCHAR(40) NOT NULL,
  PRIMARY KEY (employee_id),
  UNIQUE KEY uq_employees_email (email),
  CONSTRAINT fk_employees_department
    FOREIGN KEY (department_id) REFERENCES departments (department_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leave_types (
  leave_type_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  leave_type_name VARCHAR(80) NOT NULL,
  default_days DECIMAL(6,2) NOT NULL,
  requires_document BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (leave_type_id),
  UNIQUE KEY uq_leave_types_name (leave_type_name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leave_balances (
  leave_balance_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  leave_type_id INT UNSIGNED NOT NULL,
  balance_year SMALLINT UNSIGNED NOT NULL,
  total_days DECIMAL(6,2) NOT NULL,
  used_days DECIMAL(6,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (leave_balance_id),
  UNIQUE KEY uq_leave_balance (employee_id, leave_type_id, balance_year),
  CONSTRAINT fk_leave_balances_employee
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
  CONSTRAINT fk_leave_balances_type
    FOREIGN KEY (leave_type_id) REFERENCES leave_types (leave_type_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leave_requests (
  leave_request_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  leave_type_id INT UNSIGNED NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days DECIMAL(6,2) NOT NULL,
  reason VARCHAR(500) NOT NULL,
  document_url VARCHAR(2048) NULL,
  status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  date_submitted DATE NOT NULL,
  PRIMARY KEY (leave_request_id),
  CONSTRAINT fk_leave_requests_employee
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
  CONSTRAINT fk_leave_requests_type
    FOREIGN KEY (leave_type_id) REFERENCES leave_types (leave_type_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leave_approvals (
  approval_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  leave_request_id INT UNSIGNED NOT NULL,
  approver_id INT UNSIGNED NOT NULL,
  approval_level TINYINT UNSIGNED NOT NULL,
  decision ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
  remarks VARCHAR(500) NULL,
  decision_date DATE NULL,
  PRIMARY KEY (approval_id),
  UNIQUE KEY uq_leave_approval_level (leave_request_id, approval_level),
  CONSTRAINT fk_leave_approvals_request
    FOREIGN KEY (leave_request_id) REFERENCES leave_requests (leave_request_id),
  CONSTRAINT fk_leave_approvals_approver
    FOREIGN KEY (approver_id) REFERENCES employees (employee_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS onboarding_documents (
  document_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  document_type VARCHAR(120) NOT NULL,
  file_url VARCHAR(2048) NOT NULL,
  upload_date DATE NOT NULL,
  verification_status ENUM('Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Pending',
  verified_by INT UNSIGNED NULL,
  verified_date DATE NULL,
  file_storage_key VARCHAR(255) NULL,
  original_filename VARCHAR(255) NULL,
  file_mime_type VARCHAR(100) NULL,
  file_size INT UNSIGNED NULL,
  PRIMARY KEY (document_id),
  CONSTRAINT fk_documents_employee
    FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
  CONSTRAINT fk_documents_verifier
    FOREIGN KEY (verified_by) REFERENCES employees (employee_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_logs (
  audit_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id INT UNSIGNED NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100) NULL,
  details JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (audit_id),
  KEY idx_audit_logs_actor_created (actor_id, created_at),
  CONSTRAINT fk_audit_logs_actor
    FOREIGN KEY (actor_id) REFERENCES employees (employee_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sanitized demonstration data. Password hashes are intentionally omitted;
-- backend startup hashes the local demonstration passwords for these three seeded users.
INSERT IGNORE INTO departments (department_id, department_name, department_head_id) VALUES
  (1, 'Human Resources', 2),
  (2, 'Information Technology', 3);

INSERT IGNORE INTO employees
  (employee_id, department_id, first_name, last_name, email, password_hash,
   must_change_password, role, position, date_hired, employment_status)
VALUES
  (1, 2, 'Maria', 'Santos', 'maria.santos@company.ph', NULL, TRUE, 'Employee',
   'Junior Developer', '2026-09-01', 'Onboarding'),
  (2, 1, 'Liza', 'Ramos', 'liza.ramos@company.ph', NULL, TRUE, 'HRManager',
   'HR Manager', '2022-03-14', 'Active'),
  (3, 2, 'Jose', 'Cruz', 'jose.cruz@company.ph', NULL, TRUE, 'DepartmentHead',
   'IT Manager', '2020-06-01', 'Active');

INSERT IGNORE INTO leave_types
  (leave_type_id, leave_type_name, default_days, requires_document)
VALUES
  (1, 'Vacation', 15, FALSE),
  (2, 'Sick', 10, TRUE),
  (3, 'Emergency', 5, FALSE);

INSERT IGNORE INTO leave_balances
  (leave_balance_id, employee_id, leave_type_id, balance_year, total_days, used_days)
VALUES
  (11, 1, 1, 2026, 15, 0), (12, 1, 2, 2026, 10, 0), (13, 1, 3, 2026, 5, 0),
  (21, 2, 1, 2026, 15, 0), (22, 2, 2, 2026, 10, 0), (23, 2, 3, 2026, 5, 0),
  (31, 3, 1, 2026, 15, 0), (32, 3, 2, 2026, 10, 0), (33, 3, 3, 2026, 5, 0);

INSERT IGNORE INTO leave_requests
  (leave_request_id, employee_id, leave_type_id, start_date, end_date, total_days,
   reason, document_url, status, date_submitted)
VALUES
  (1, 1, 1, '2026-10-26', '2026-10-28', 3, 'Family trip', NULL, 'Pending', '2026-10-15');

INSERT IGNORE INTO leave_approvals
  (approval_id, leave_request_id, approver_id, approval_level, decision, remarks, decision_date)
VALUES
  (1, 1, 3, 1, 'Pending', NULL, NULL),
  (2, 1, 2, 2, 'Pending', NULL, NULL);

INSERT IGNORE INTO onboarding_documents
  (document_id, employee_id, document_type, file_url, upload_date,
   verification_status, verified_by, verified_date)
VALUES
  (1, 1, 'Valid ID', 'drive://valid-id.pdf', '2026-09-02', 'Verified', 2, '2026-09-03'),
  (2, 1, 'Signed Contract', 'drive://contract.pdf', '2026-09-02', 'Pending', NULL, NULL);
