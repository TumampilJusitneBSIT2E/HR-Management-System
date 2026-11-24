import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity({ name: 'departments' })
export class DepartmentEntity {
  @PrimaryGeneratedColumn({ name: 'department_id', type: 'int', unsigned: true })
  departmentId!: number;

  @Column({ name: 'department_name', type: 'varchar', length: 120, unique: true })
  departmentName!: string;

  @Column({ name: 'department_head_id', type: 'int', unsigned: true, default: 0 })
  departmentHeadId!: number;

  @OneToMany(() => EmployeeEntity, (employee) => employee.department)
  employees!: EmployeeEntity[];
}

@Entity({ name: 'employees' })
export class EmployeeEntity {
  @PrimaryGeneratedColumn({ name: 'employee_id', type: 'int', unsigned: true })
  employeeId!: number;

  @Column({ name: 'department_id', type: 'int', unsigned: true })
  departmentId!: number;

  @ManyToOne(() => DepartmentEntity, (department) => department.employees)
  @JoinColumn({ name: 'department_id' })
  department!: DepartmentEntity;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  lastName!: string;

  @Column({ name: 'email', type: 'varchar', length: 254, unique: true })
  email!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ name: 'must_change_password', type: 'boolean', default: false })
  mustChangePassword!: boolean;

  @Column({ name: 'token_version', type: 'int', unsigned: true, default: 0 })
  tokenVersion!: number;

  @Column({ name: 'role', type: 'enum', enum: ['Employee', 'DepartmentHead', 'HRManager'], default: 'Employee' })
  role!: 'Employee' | 'DepartmentHead' | 'HRManager';

  @Column({ name: 'position', type: 'varchar', length: 120 })
  position!: string;

  @Column({ name: 'date_hired', type: 'date' })
  dateHired!: string;

  @Column({ name: 'employment_status', type: 'varchar', length: 40 })
  employmentStatus!: string;

  @OneToMany(() => LeaveBalanceEntity, (balance) => balance.employee)
  leaveBalances!: LeaveBalanceEntity[];

  @OneToMany(() => LeaveRequestEntity, (request) => request.employee)
  leaveRequests!: LeaveRequestEntity[];

  @OneToMany(() => LeaveApprovalEntity, (approval) => approval.approver)
  approvals!: LeaveApprovalEntity[];

  @OneToMany(() => OnboardingDocumentEntity, (document) => document.employee)
  documents!: OnboardingDocumentEntity[];
}

@Entity({ name: 'leave_types' })
export class LeaveTypeEntity {
  @PrimaryGeneratedColumn({ name: 'leave_type_id', type: 'int', unsigned: true })
  leaveTypeId!: number;

  @Column({ name: 'leave_type_name', type: 'varchar', length: 80, unique: true })
  leaveTypeName!: string;

  @Column({ name: 'default_days', type: 'decimal', precision: 6, scale: 2 })
  defaultDays!: number;

  @Column({ name: 'requires_document', type: 'boolean', default: false })
  requiresDocument!: boolean;

  @OneToMany(() => LeaveBalanceEntity, (balance) => balance.leaveType)
  leaveBalances!: LeaveBalanceEntity[];

  @OneToMany(() => LeaveRequestEntity, (request) => request.leaveType)
  leaveRequests!: LeaveRequestEntity[];
}

@Entity({ name: 'leave_balances' })
@Unique('uq_leave_balance', ['employeeId', 'leaveTypeId', 'balanceYear'])
export class LeaveBalanceEntity {
  @PrimaryGeneratedColumn({ name: 'leave_balance_id', type: 'int', unsigned: true })
  leaveBalanceId!: number;

  @Column({ name: 'employee_id', type: 'int', unsigned: true })
  employeeId!: number;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.leaveBalances)
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @Column({ name: 'leave_type_id', type: 'int', unsigned: true })
  leaveTypeId!: number;

  @ManyToOne(() => LeaveTypeEntity, (leaveType) => leaveType.leaveBalances)
  @JoinColumn({ name: 'leave_type_id' })
  leaveType!: LeaveTypeEntity;

  @Column({ name: 'balance_year', type: 'smallint', unsigned: true })
  balanceYear!: number;

  @Column({ name: 'total_days', type: 'decimal', precision: 6, scale: 2 })
  totalDays!: number;

  @Column({ name: 'used_days', type: 'decimal', precision: 6, scale: 2, default: 0 })
  usedDays!: number;
}

@Entity({ name: 'leave_requests' })
export class LeaveRequestEntity {
  @PrimaryGeneratedColumn({ name: 'leave_request_id', type: 'int', unsigned: true })
  leaveRequestId!: number;

  @Column({ name: 'employee_id', type: 'int', unsigned: true })
  employeeId!: number;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.leaveRequests)
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @Column({ name: 'leave_type_id', type: 'int', unsigned: true })
  leaveTypeId!: number;

  @ManyToOne(() => LeaveTypeEntity, (leaveType) => leaveType.leaveRequests)
  @JoinColumn({ name: 'leave_type_id' })
  leaveType!: LeaveTypeEntity;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate!: string;

  @Column({ name: 'total_days', type: 'decimal', precision: 6, scale: 2 })
  totalDays!: number;

  @Column({ name: 'reason', type: 'varchar', length: 500 })
  reason!: string;

  @Column({ name: 'document_url', type: 'varchar', length: 2048, nullable: true })
  documentUrl!: string | null;

  @Column({ name: 'status', type: 'enum', enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' })
  status!: 'Pending' | 'Approved' | 'Rejected';

  @Column({ name: 'date_submitted', type: 'date' })
  dateSubmitted!: string;

  @OneToMany(() => LeaveApprovalEntity, (approval) => approval.leaveRequest)
  approvals!: LeaveApprovalEntity[];
}

@Entity({ name: 'leave_approvals' })
@Unique('uq_leave_approval_level', ['leaveRequestId', 'approvalLevel'])
export class LeaveApprovalEntity {
  @PrimaryGeneratedColumn({ name: 'approval_id', type: 'int', unsigned: true })
  approvalId!: number;

  @Column({ name: 'leave_request_id', type: 'int', unsigned: true })
  leaveRequestId!: number;

  @ManyToOne(() => LeaveRequestEntity, (request) => request.approvals)
  @JoinColumn({ name: 'leave_request_id' })
  leaveRequest!: LeaveRequestEntity;

  @Column({ name: 'approver_id', type: 'int', unsigned: true })
  approverId!: number;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.approvals)
  @JoinColumn({ name: 'approver_id' })
  approver!: EmployeeEntity;

  @Column({ name: 'approval_level', type: 'tinyint', unsigned: true })
  approvalLevel!: number;

  @Column({ name: 'decision', type: 'enum', enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' })
  decision!: 'Pending' | 'Approved' | 'Rejected';

  @Column({ name: 'remarks', type: 'varchar', length: 500, nullable: true })
  remarks!: string | null;

  @Column({ name: 'decision_date', type: 'date', nullable: true })
  decisionDate!: string | null;
}

@Entity({ name: 'onboarding_documents' })
export class OnboardingDocumentEntity {
  @PrimaryGeneratedColumn({ name: 'document_id', type: 'int', unsigned: true })
  documentId!: number;

  @Column({ name: 'employee_id', type: 'int', unsigned: true })
  employeeId!: number;

  @ManyToOne(() => EmployeeEntity, (employee) => employee.documents)
  @JoinColumn({ name: 'employee_id' })
  employee!: EmployeeEntity;

  @Column({ name: 'document_type', type: 'varchar', length: 120 })
  documentType!: string;

  @Column({ name: 'file_url', type: 'varchar', length: 2048 })
  fileUrl!: string;

  @Column({ name: 'upload_date', type: 'date' })
  uploadDate!: string;

  @Column({ name: 'verification_status', type: 'enum', enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' })
  verificationStatus!: 'Pending' | 'Verified' | 'Rejected';

  @Column({ name: 'verified_by', type: 'int', unsigned: true, nullable: true })
  verifiedBy!: number | null;

  @ManyToOne(() => EmployeeEntity, { nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier!: EmployeeEntity | null;

  @Column({ name: 'verified_date', type: 'date', nullable: true })
  verifiedDate!: string | null;

  @Column({ name: 'file_storage_key', type: 'varchar', length: 255, nullable: true })
  fileStorageKey!: string | null;

  @Column({ name: 'original_filename', type: 'varchar', length: 255, nullable: true })
  originalFilename!: string | null;

  @Column({ name: 'file_mime_type', type: 'varchar', length: 100, nullable: true })
  fileMimeType!: string | null;

  @Column({ name: 'file_size', type: 'int', unsigned: true, nullable: true })
  fileSize!: number | null;
}

@Entity({ name: 'audit_logs' })
export class AuditLogEntity {
  @PrimaryGeneratedColumn({ name: 'audit_id', type: 'bigint', unsigned: true })
  auditId!: string;

  @Column({ name: 'actor_id', type: 'int', unsigned: true, nullable: true })
  actorId!: number | null;

  @ManyToOne(() => EmployeeEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor!: EmployeeEntity | null;

  @Column({ name: 'action', type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'resource_type', type: 'varchar', length: 100 })
  resourceType!: string;

  @Column({ name: 'resource_id', type: 'varchar', length: 100, nullable: true })
  resourceId!: string | null;

  @Column({ name: 'details', type: 'json', nullable: true })
  details!: Record<string, unknown> | null;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}
