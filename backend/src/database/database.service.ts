import { Injectable, OnModuleInit } from '@nestjs/common';
import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { DataSource, EntityManager } from 'typeorm';
import { hash } from 'bcryptjs';
import { seedData } from '../hr/hr.types';

type SqlValue = string | number | bigint | boolean | Date | null | Buffer | Uint8Array;
type SqlConnection = {
  execute<T>(sql: string, values?: SqlValue[]): Promise<[T, undefined]>;
};

@Injectable()
export class DatabaseService implements OnModuleInit {
  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit() {
    await this.initializeSchema();
    await this.seedDatabase();
  }

  async query<T extends RowDataPacket[]>(sql: string, values: SqlValue[] = []): Promise<T> {
    return this.dataSource.query(sql, values) as Promise<T>;
  }

  async execute(sql: string, values: SqlValue[] = []): Promise<ResultSetHeader> {
    return this.dataSource.query(sql, values) as Promise<ResultSetHeader>;
  }

  transaction<T>(work: (connection: SqlConnection) => Promise<T>): Promise<T> {
    return this.dataSource.transaction((manager) =>
      work({
        execute: <Result>(sql: string, values: SqlValue[] = []) =>
          this.executeInTransaction<Result>(manager, sql, values),
      }),
    );
  }

  private async executeInTransaction<T>(
    manager: EntityManager,
    sql: string,
    values: SqlValue[],
  ): Promise<[T, undefined]> {
    const result = await manager.query(sql, values);
    return [result as T, undefined];
  }

  private async initializeSchema() {
    const statements = [
      `CREATE TABLE IF NOT EXISTS departments (
        department_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        department_name VARCHAR(120) NOT NULL UNIQUE,
        department_head_id INT UNSIGNED NOT NULL DEFAULT 0
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS employees (
        employee_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        department_id INT UNSIGNED NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(254) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NULL,
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        token_version INT UNSIGNED NOT NULL DEFAULT 0,
        role ENUM('Employee', 'DepartmentHead', 'HRManager') NOT NULL DEFAULT 'Employee',
        position VARCHAR(120) NOT NULL,
        date_hired DATE NOT NULL,
        employment_status VARCHAR(40) NOT NULL,
        CONSTRAINT fk_employees_department
          FOREIGN KEY (department_id) REFERENCES departments (department_id)
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS leave_types (
        leave_type_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        leave_type_name VARCHAR(80) NOT NULL UNIQUE,
        default_days DECIMAL(6,2) NOT NULL,
        requires_document BOOLEAN NOT NULL DEFAULT FALSE
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS leave_balances (
        leave_balance_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        employee_id INT UNSIGNED NOT NULL,
        leave_type_id INT UNSIGNED NOT NULL,
        balance_year SMALLINT UNSIGNED NOT NULL,
        total_days DECIMAL(6,2) NOT NULL,
        used_days DECIMAL(6,2) NOT NULL DEFAULT 0,
        UNIQUE KEY uq_leave_balance (employee_id, leave_type_id, balance_year),
        CONSTRAINT fk_leave_balances_employee
          FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
        CONSTRAINT fk_leave_balances_type
          FOREIGN KEY (leave_type_id) REFERENCES leave_types (leave_type_id)
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS leave_requests (
        leave_request_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        employee_id INT UNSIGNED NOT NULL,
        leave_type_id INT UNSIGNED NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        total_days DECIMAL(6,2) NOT NULL,
        reason VARCHAR(500) NOT NULL,
        document_url VARCHAR(2048) NULL,
        status ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        date_submitted DATE NOT NULL,
        CONSTRAINT fk_leave_requests_employee
          FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
        CONSTRAINT fk_leave_requests_type
          FOREIGN KEY (leave_type_id) REFERENCES leave_types (leave_type_id)
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS leave_approvals (
        approval_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        leave_request_id INT UNSIGNED NOT NULL,
        approver_id INT UNSIGNED NOT NULL,
        approval_level TINYINT UNSIGNED NOT NULL,
        decision ENUM('Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Pending',
        remarks VARCHAR(500) NULL,
        decision_date DATE NULL,
        UNIQUE KEY uq_leave_approval_level (leave_request_id, approval_level),
        CONSTRAINT fk_leave_approvals_request
          FOREIGN KEY (leave_request_id) REFERENCES leave_requests (leave_request_id),
        CONSTRAINT fk_leave_approvals_approver
          FOREIGN KEY (approver_id) REFERENCES employees (employee_id)
      ) ENGINE=InnoDB`,
      `CREATE TABLE IF NOT EXISTS onboarding_documents (
        document_id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
        CONSTRAINT fk_documents_employee
          FOREIGN KEY (employee_id) REFERENCES employees (employee_id),
        CONSTRAINT fk_documents_verifier
          FOREIGN KEY (verified_by) REFERENCES employees (employee_id)
      ) ENGINE=InnoDB`,
    ];

    for (const statement of statements) {
      await this.dataSource.query(statement);
    }

    await this.ensureColumn('employees', 'password_hash', 'VARCHAR(255) NULL');
    const migratedPasswordChange = await this.ensureColumn(
      'employees',
      'must_change_password',
      'BOOLEAN NOT NULL DEFAULT FALSE',
    );
    await this.ensureColumn('employees', 'token_version', 'INT UNSIGNED NOT NULL DEFAULT 0');
    if (migratedPasswordChange) {
      await this.dataSource.query(
        `UPDATE employees
         SET must_change_password = TRUE
         WHERE email IN (
           'maria.santos@company.ph',
           'liza.ramos@company.ph',
           'jose.cruz@company.ph'
         )`,
      );
    }

    await this.ensureColumn('onboarding_documents', 'file_storage_key', 'VARCHAR(255) NULL');
    await this.ensureColumn('onboarding_documents', 'original_filename', 'VARCHAR(255) NULL');
    await this.ensureColumn('onboarding_documents', 'file_mime_type', 'VARCHAR(100) NULL');
    await this.ensureColumn('onboarding_documents', 'file_size', 'INT UNSIGNED NULL');

    await this.dataSource.query(
      `CREATE TABLE IF NOT EXISTS audit_logs (
        audit_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        actor_id INT UNSIGNED NULL,
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100) NOT NULL,
        resource_id VARCHAR(100) NULL,
        details JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_audit_logs_actor_created (actor_id, created_at),
        CONSTRAINT fk_audit_logs_actor
          FOREIGN KEY (actor_id) REFERENCES employees (employee_id) ON DELETE SET NULL
      ) ENGINE=InnoDB`,
    );
  }

  private async ensureColumn(table: string, column: string, definition: string) {
    const columns = await this.query<RowDataPacket[]>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
      [table, column],
    );
    if (columns.length > 0) return false;

    await this.dataSource.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    return true;
  }

  private async seedDatabase() {
    const demoPasswordVariables = new Map([
      [1, 'DEMO_EMPLOYEE_PASSWORD'],
      [2, 'DEMO_HR_PASSWORD'],
      [3, 'DEMO_DEPARTMENT_HEAD_PASSWORD'],
    ]);

    for (const department of seedData.departments) {
      await this.execute(
        `INSERT IGNORE INTO departments
          (department_id, department_name, department_head_id)
         VALUES (?, ?, ?)`,
        [department.DepartmentID, department.DepartmentName, department.DepartmentHeadID],
      );
    }

    for (const employee of seedData.employees) {
      const passwordVariable = demoPasswordVariables.get(employee.EmployeeID);
      const demoPassword = passwordVariable ? process.env[passwordVariable] : undefined;
      if (demoPassword && !this.isValidPassword(demoPassword)) {
        throw new Error(`${passwordVariable} must be at least 12 characters and include lower/upper case, a number, and a symbol.`);
      }
      const passwordHash = demoPassword ? await hash(demoPassword, 12) : null;
      await this.execute(
        `INSERT IGNORE INTO employees
          (employee_id, department_id, first_name, last_name, email, password_hash,
           must_change_password, role, position, date_hired, employment_status)
         VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?)`,
        [
          employee.EmployeeID,
          employee.DepartmentID,
          employee.FirstName,
          employee.LastName,
          employee.Email,
          passwordHash,
          employee.Role,
          employee.Position,
          employee.DateHired,
          employee.EmploymentStatus,
        ],
      );
      if (passwordHash) {
        await this.execute(
          `UPDATE employees SET password_hash = ?, must_change_password = TRUE
           WHERE employee_id = ? AND password_hash IS NULL`,
          [passwordHash, employee.EmployeeID],
        );
      }
    }

    for (const type of seedData.leaveTypes) {
      await this.execute(
        `INSERT IGNORE INTO leave_types
          (leave_type_id, leave_type_name, default_days, requires_document)
         VALUES (?, ?, ?, ?)`,
        [type.LeaveTypeID, type.LeaveTypeName, type.DefaultDays, type.RequiresDocument],
      );
    }

    for (const balance of seedData.leaveBalances) {
      await this.execute(
        `INSERT IGNORE INTO leave_balances
          (leave_balance_id, employee_id, leave_type_id, balance_year, total_days, used_days)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          balance.LeaveBalanceID,
          balance.EmployeeID,
          balance.LeaveTypeID,
          balance.BalanceYear,
          balance.TotalDays,
          balance.UsedDays,
        ],
      );
    }

    for (const request of seedData.leaveRequests) {
      await this.execute(
        `INSERT IGNORE INTO leave_requests
          (leave_request_id, employee_id, leave_type_id, start_date, end_date, total_days, reason, document_url, status, date_submitted)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          request.LeaveRequestID,
          request.EmployeeID,
          request.LeaveTypeID,
          request.StartDate,
          request.EndDate,
          request.TotalDays,
          request.Reason,
          request.DocumentURL,
          request.Status,
          request.DateSubmitted,
        ],
      );
    }

    for (const approval of seedData.leaveApprovals) {
      await this.execute(
        `INSERT IGNORE INTO leave_approvals
          (approval_id, leave_request_id, approver_id, approval_level, decision, remarks, decision_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          approval.ApprovalID,
          approval.LeaveRequestID,
          approval.ApproverID,
          approval.ApprovalLevel,
          approval.Decision,
          approval.Remarks,
          approval.DecisionDate,
        ],
      );
    }

    for (const document of seedData.onboardingDocuments) {
      await this.execute(
        `INSERT IGNORE INTO onboarding_documents
          (document_id, employee_id, document_type, file_url, upload_date, verification_status, verified_by, verified_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          document.DocumentID,
          document.EmployeeID,
          document.DocumentType,
          document.FileURL,
          document.UploadDate,
          document.VerificationStatus,
          document.VerifiedBy,
          document.VerifiedDate,
        ],
      );
    }
  }

  private isValidPassword(password: string): boolean {
    return (
      password.length >= 12 &&
      /[a-z]/.test(password) &&
      /[A-Z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z\d]/.test(password)
    );
  }
}
