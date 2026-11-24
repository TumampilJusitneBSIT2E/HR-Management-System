import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { access, mkdir, rm, writeFile } from 'node:fs/promises';
import { basename, resolve, sep } from 'node:path';
import { Repository } from 'typeorm';
import {
  AuditLogEntity,
  DepartmentEntity,
  EmployeeEntity,
  LeaveApprovalEntity,
  LeaveBalanceEntity,
  LeaveRequestEntity,
  LeaveTypeEntity,
  OnboardingDocumentEntity,
} from '../database/entities';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import {
  type Department,
  type Employee,
  type LeaveApproval,
  type LeaveBalance,
  type LeaveRequest,
  type LeaveType,
  type OnboardingDocument,
} from './hr.types';

interface DocumentFile {
  absolutePath: string;
  contentType: string;
  filename: string;
}

@Injectable()
export class HrService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departmentRepository: Repository<DepartmentEntity>,
    @InjectRepository(LeaveTypeEntity)
    private readonly leaveTypeRepository: Repository<LeaveTypeEntity>,
    @InjectRepository(LeaveBalanceEntity)
    private readonly leaveBalanceRepository: Repository<LeaveBalanceEntity>,
    @InjectRepository(LeaveRequestEntity)
    private readonly leaveRequestRepository: Repository<LeaveRequestEntity>,
    @InjectRepository(LeaveApprovalEntity)
    private readonly leaveApprovalRepository: Repository<LeaveApprovalEntity>,
    @InjectRepository(OnboardingDocumentEntity)
    private readonly documentRepository: Repository<OnboardingDocumentEntity>,
  ) {}

  async getEmployees(): Promise<Employee[]> {
    const employees = await this.employeeRepository.find({ order: { employeeId: 'ASC' } });
    return employees.map((employee) => this.toEmployee(employee));
  }

  async getEmployee(employeeId: number): Promise<Employee> {
    const employee = await this.employeeRepository.findOneBy({ employeeId });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return this.toEmployee(employee);
  }

  async createEmployee(dto: CreateEmployeeDto, actorId: number): Promise<Employee> {
    const passwordHash = await hash(dto.InitialPassword, 10);
    return this.employeeRepository.manager.transaction(async (manager) => {
      const departments = manager.getRepository(DepartmentEntity);
      const employees = manager.getRepository(EmployeeEntity);
      const balances = manager.getRepository(LeaveBalanceEntity);
      const leaveTypes = manager.getRepository(LeaveTypeEntity);
      const auditLogs = manager.getRepository(AuditLogEntity);
      const department = await departments.findOneBy({ departmentId: dto.DepartmentID });
      if (!department) {
        throw new NotFoundException('Department not found');
      }

      const email = dto.Email.trim().toLowerCase();
      if (await employees.findOneBy({ email })) {
        throw new ConflictException('An employee with this email already exists.');
      }

      const employee = await employees.save(
        employees.create({
          departmentId: dto.DepartmentID,
          firstName: dto.FirstName.trim(),
          lastName: dto.LastName.trim(),
          email,
          passwordHash,
          mustChangePassword: true,
          tokenVersion: 0,
          role: dto.Role,
          position: dto.Position.trim(),
          dateHired: new Date().toISOString().slice(0, 10),
          employmentStatus: 'Active',
        }),
      );

      const currentYear = new Date().getFullYear();
      const types = await leaveTypes.find();
      if (types.length > 0) {
        await balances.save(
          types.map((type) =>
            balances.create({
              employeeId: employee.employeeId,
              leaveTypeId: type.leaveTypeId,
              balanceYear: currentYear,
              totalDays: type.defaultDays,
              usedDays: 0,
            }),
          ),
        );
      }

      if (dto.Role === 'DepartmentHead') {
        department.departmentHeadId = employee.employeeId;
        await departments.save(department);
      }

      await auditLogs.save({
        actorId,
        action: 'employee.created',
        resourceType: 'employee',
        resourceId: String(employee.employeeId),
        details: { departmentId: dto.DepartmentID, role: dto.Role },
      });

      return this.toEmployee(employee);
    });
  }

  async deactivateEmployee(employeeId: number, currentEmployeeId: number): Promise<{ success: true }> {
    if (employeeId === currentEmployeeId) {
      throw new ConflictException('You cannot deactivate your own account.');
    }

    return this.employeeRepository.manager.transaction(async (manager) => {
      const employees = manager.getRepository(EmployeeEntity);
      const departments = manager.getRepository(DepartmentEntity);
      const employee = await employees.findOne({
        where: { employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      if (employee.role === 'HRManager') {
        const managers = await employees.count({
          where: { role: 'HRManager', employmentStatus: 'Active' },
        });
        if (managers <= 1) {
          throw new ConflictException('The last active HR manager cannot be deactivated.');
        }
      }

      employee.employmentStatus = 'Inactive';
      await employees.save(employee);
      await departments.update({ departmentHeadId: employeeId }, { departmentHeadId: 0 });
      return { success: true };
    });
  }

  async updateEmployee(employeeId: number, dto: UpdateEmployeeDto): Promise<Employee> {
    if (!Object.values(dto).some((value) => value !== undefined)) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    return this.employeeRepository.manager.transaction(async (manager) => {
      const employees = manager.getRepository(EmployeeEntity);
      const employee = await employees.findOne({
        where: { employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      if (dto.Email !== undefined) {
        const email = dto.Email.trim().toLowerCase();
        const existing = await employees.findOneBy({ email });
        if (existing && existing.employeeId !== employeeId) {
          throw new ConflictException('An employee with this email already exists.');
        }
        employee.email = email;
      }
      if (dto.FirstName !== undefined) employee.firstName = dto.FirstName.trim();
      if (dto.LastName !== undefined) employee.lastName = dto.LastName.trim();
      if (dto.Position !== undefined) employee.position = dto.Position.trim();

      return this.toEmployee(await employees.save(employee));
    });
  }

  async resetEmployeePassword(employeeId: number, actorId: number): Promise<{ temporaryPassword: string }> {
    if (employeeId === actorId) {
      throw new ConflictException('Use the change-password screen to update your own password.');
    }

    return this.employeeRepository.manager.transaction(async (manager) => {
      const employees = manager.getRepository(EmployeeEntity);
      const employee = await employees.findOne({
        where: { employeeId, employmentStatus: 'Active' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) {
        throw new NotFoundException('Active employee account not found.');
      }

      const temporaryPassword = `${randomUUID().replace(/-/g, '')}A1!`;
      const passwordHash = await hash(temporaryPassword, 12);
      employee.passwordHash = passwordHash;
      employee.mustChangePassword = true;
      employee.tokenVersion += 1;
      await employees.save(employee);
      await manager.getRepository(AuditLogEntity).save({
        actorId,
        action: 'password.reset',
        resourceType: 'employee',
        resourceId: String(employeeId),
      });
      return { temporaryPassword };
    });
  }

  getDepartments(): Promise<Department[]> {
    return this.departmentRepository.find({ order: { departmentId: 'ASC' } }).then((rows) =>
      rows.map((row) => ({
        DepartmentID: row.departmentId,
        DepartmentName: row.departmentName,
        DepartmentHeadID: row.departmentHeadId,
      })),
    );
  }

  async getLeaveTypes(): Promise<LeaveType[]> {
    const rows = await this.leaveTypeRepository.find({ order: { leaveTypeId: 'ASC' } });
    return rows.map((row) => ({
      LeaveTypeID: row.leaveTypeId,
      LeaveTypeName: row.leaveTypeName,
      DefaultDays: Number(row.defaultDays),
      RequiresDocument: Boolean(row.requiresDocument),
    }));
  }

  async getLeaveBalances(employeeId?: number): Promise<LeaveBalance[]> {
    const [balances, pendingRequests] = await Promise.all([
      this.leaveBalanceRepository.find({
        where: employeeId === undefined ? {} : { employeeId },
        order: { employeeId: 'ASC', leaveTypeId: 'ASC', balanceYear: 'ASC' },
      }),
      this.leaveRequestRepository.find({
        where: employeeId === undefined
          ? { status: 'Pending' }
          : { employeeId, status: 'Pending' },
      }),
    ]);
    const reservations = new Map<string, number>();
    for (const request of pendingRequests) {
      const key = `${request.employeeId}:${request.leaveTypeId}:${request.startDate.slice(0, 4)}`;
      reservations.set(key, (reservations.get(key) ?? 0) + Number(request.totalDays));
    }

    return balances.map((balance) => ({
      LeaveBalanceID: balance.leaveBalanceId,
      EmployeeID: balance.employeeId,
      LeaveTypeID: balance.leaveTypeId,
      BalanceYear: balance.balanceYear,
      TotalDays: Number(balance.totalDays),
      UsedDays: Number(balance.usedDays),
      ReservedDays:
        reservations.get(`${balance.employeeId}:${balance.leaveTypeId}:${balance.balanceYear}`) ?? 0,
    }));
  }

  getLeaveRequests(user: AuthenticatedUser): Promise<LeaveRequest[]> {
    const query = this.leaveRequestRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.employee', 'employee')
      .orderBy('request.leaveRequestId', 'ASC');
    if (user.Role === 'DepartmentHead') {
      query.where('employee.department_id = :departmentId', {
        departmentId: user.DepartmentID,
      });
    } else if (user.Role !== 'HRManager') {
      query.where('request.employee_id = :employeeId', { employeeId: user.EmployeeID });
    }

    return query.getMany().then((requests) =>
      requests.map((request) => this.toLeaveRequest(request, request.employee)),
    );
  }

  async getApprovals(employeeId: number): Promise<LeaveApproval[]> {
    const rows = await this.leaveApprovalRepository
      .createQueryBuilder('approval')
      .innerJoin('approval.leaveRequest', 'request')
      .where('approval.approver_id = :employeeId OR request.employee_id = :employeeId', {
        employeeId,
      })
      .orderBy('approval.approvalId', 'ASC')
      .getMany();
    return rows.map((approval) => ({
      ApprovalID: approval.approvalId,
      LeaveRequestID: approval.leaveRequestId,
      ApproverID: approval.approverId,
      ApprovalLevel: approval.approvalLevel as 1 | 2,
      Decision: approval.decision,
      Remarks: approval.remarks,
      DecisionDate: approval.decisionDate,
    }));
  }

  async getDocuments(employeeId?: number): Promise<OnboardingDocument[]> {
    const rows = await this.documentRepository.find({
      where: employeeId === undefined ? {} : { employeeId },
      order: { documentId: 'ASC' },
    });
    return rows.map((document) => this.toOnboardingDocument(document));
  }

  createLeaveRequest(dto: CreateLeaveRequestDto, employeeId: number): Promise<LeaveRequest> {
    if (!dto.Reason.trim()) {
      throw new BadRequestException('Please provide a reason for the leave request.');
    }
    if (dto.EndDate < dto.StartDate) {
      throw new BadRequestException('The end date must be on or after the start date.');
    }
    if (dto.StartDate.slice(0, 4) !== dto.EndDate.slice(0, 4)) {
      throw new BadRequestException('A leave request must stay within one calendar year.');
    }
    const totalDays = this.daysBetween(dto.StartDate, dto.EndDate);
    if (totalDays < 1) {
      throw new BadRequestException('The selected date range is invalid.');
    }

    return this.leaveRequestRepository.manager.transaction(async (manager) => {
      const employee = await manager.getRepository(EmployeeEntity).findOne({
        where: { employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      const leaveType = await manager
        .getRepository(LeaveTypeEntity)
        .findOneBy({ leaveTypeId: dto.LeaveTypeID });
      if (!leaveType) {
        throw new NotFoundException('Leave type not found');
      }
      if (leaveType.requiresDocument && !dto.DocumentURL?.trim()) {
        throw new BadRequestException('This leave type requires a supporting document reference.');
      }
      if (dto.DocumentURL) {
        const document = await manager.getRepository(OnboardingDocumentEntity).findOneBy({
          employeeId,
          fileUrl: dto.DocumentURL,
        });
        if (
          !document ||
          !document.fileStorageKey ||
          document.verificationStatus === 'Rejected'
        ) {
          throw new BadRequestException('Choose a document you have uploaded to this account.');
        }
      }

      const balance = await manager.getRepository(LeaveBalanceEntity).findOne({
        where: {
          employeeId,
          leaveTypeId: dto.LeaveTypeID,
          balanceYear: Number(dto.StartDate.slice(0, 4)),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!balance) {
        throw new BadRequestException('No leave balance exists for this type and year.');
      }

      const reservations = await manager.query(
        `SELECT COALESCE(SUM(total_days), 0) AS ReservedDays
         FROM leave_requests
         WHERE employee_id = ? AND leave_type_id = ? AND status = 'Pending'
           AND YEAR(start_date) = YEAR(?)`,
        [employeeId, dto.LeaveTypeID, dto.StartDate],
      );
      const availableDays =
        Number(balance.totalDays) -
        Number(balance.usedDays) -
        Number(reservations[0]?.ReservedDays ?? 0);
      if (totalDays > availableDays) {
        throw new BadRequestException(`The request exceeds your available balance of ${availableDays} days.`);
      }

      const overlaps = await manager
        .getRepository(LeaveRequestEntity)
        .createQueryBuilder('request')
        .where('request.employee_id = :employeeId', { employeeId })
        .andWhere('request.status IN (:...statuses)', { statuses: ['Pending', 'Approved'] })
        .andWhere('request.start_date <= :endDate', { endDate: dto.EndDate })
        .andWhere('request.end_date >= :startDate', { startDate: dto.StartDate })
        .getMany();
      if (
        overlaps.some((item) =>
          this.hasWorkingDayOverlap(dto.StartDate, dto.EndDate, item.startDate, item.endDate),
        )
      ) {
        throw new ConflictException('This leave request overlaps an existing pending or approved request.');
      }

      const createdRequest = await manager.getRepository(LeaveRequestEntity).save(
        manager.getRepository(LeaveRequestEntity).create({
          employeeId,
          leaveTypeId: dto.LeaveTypeID,
          startDate: dto.StartDate,
          endDate: dto.EndDate,
          totalDays,
          reason: dto.Reason.trim(),
          documentUrl: dto.DocumentURL ?? null,
          status: 'Pending',
          dateSubmitted: new Date().toISOString().slice(0, 10),
        }),
      );

      const department = await manager.getRepository(DepartmentEntity).findOneBy({
        departmentId: employee.departmentId,
      });
      const hrManager = await manager.getRepository(EmployeeEntity).findOne({
        where: { role: 'HRManager', employmentStatus: 'Active' },
        order: { employeeId: 'ASC' },
      });
      const approvers = [
        ...new Set([department?.departmentHeadId ?? 0, hrManager?.employeeId ?? 0]),
      ].filter((id) => id && id !== employeeId);
      if (approvers.length === 0) {
        throw new ConflictException('No eligible approver is available for this leave request.');
      }

      await manager.getRepository(LeaveApprovalEntity).save(
        approvers.map((approverId, index) =>
          manager.getRepository(LeaveApprovalEntity).create({
            leaveRequestId: createdRequest.leaveRequestId,
            approverId,
            approvalLevel: index + 1,
            decision: 'Pending',
          }),
        ),
      );

      await manager.getRepository(AuditLogEntity).save({
        actorId: employeeId,
        action: 'leave.created',
        resourceType: 'leave_request',
        resourceId: String(createdRequest.leaveRequestId),
      });

      return this.toLeaveRequest(createdRequest);
    });
  }

  async getLeaveRequest(requestId: number, user: AuthenticatedUser): Promise<LeaveRequest> {
    const request = await this.leaveRequestRepository.findOne({
      where: { leaveRequestId: requestId },
      relations: { employee: true },
    });
    if (
      !request ||
      !request.employee ||
      (user.Role === 'Employee' && request.employeeId !== user.EmployeeID) ||
      (user.Role === 'DepartmentHead' && request.employee.departmentId !== user.DepartmentID)
    ) {
      throw new NotFoundException('Leave request not found.');
    }

    return this.toLeaveRequest(request, request.employee);
  }

  async updateLeaveRequest(
    requestId: number,
    dto: UpdateLeaveRequestDto,
    employeeId: number,
  ): Promise<LeaveRequest> {
    if (!Object.values(dto).some((value) => value !== undefined)) {
      throw new BadRequestException('Provide at least one field to update.');
    }

    return this.leaveRequestRepository.manager.transaction(async (manager) => {
      const requests = manager.getRepository(LeaveRequestEntity);
      const request = await requests.findOne({
        where: { leaveRequestId: requestId, employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request) {
        throw new NotFoundException('Leave request not found.');
      }
      if (request.status !== 'Pending') {
        throw new ConflictException('Only pending leave requests can be updated.');
      }

      const leaveTypeId = dto.LeaveTypeID ?? request.leaveTypeId;
      const startDate = dto.StartDate ?? request.startDate;
      const endDate = dto.EndDate ?? request.endDate;
      const reason = dto.Reason === undefined ? request.reason : dto.Reason.trim();
      const documentUrl = dto.DocumentURL === undefined ? request.documentUrl : dto.DocumentURL;
      if (!reason) {
        throw new BadRequestException('Please provide a reason for the leave request.');
      }
      if (endDate < startDate) {
        throw new BadRequestException('The end date must be on or after the start date.');
      }
      if (startDate.slice(0, 4) !== endDate.slice(0, 4)) {
        throw new BadRequestException('A leave request must stay within one calendar year.');
      }

      const totalDays = this.daysBetween(startDate, endDate);
      if (totalDays < 1) {
        throw new BadRequestException('The selected date range is invalid.');
      }

      const leaveType = await manager.getRepository(LeaveTypeEntity).findOneBy({ leaveTypeId });
      if (!leaveType) {
        throw new NotFoundException('Leave type not found.');
      }
      if (leaveType.requiresDocument && !documentUrl?.trim()) {
        throw new BadRequestException('This leave type requires a supporting document reference.');
      }
      if (documentUrl) {
        const document = await manager.getRepository(OnboardingDocumentEntity).findOneBy({
          employeeId,
          fileUrl: documentUrl,
        });
        if (
          !document ||
          !document.fileStorageKey ||
          document.verificationStatus === 'Rejected'
        ) {
          throw new BadRequestException('Choose a document you have uploaded to this account.');
        }
      }

      const balance = await manager.getRepository(LeaveBalanceEntity).findOne({
        where: {
          employeeId,
          leaveTypeId,
          balanceYear: Number(startDate.slice(0, 4)),
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (!balance) {
        throw new BadRequestException('No leave balance exists for this type and year.');
      }

      const reservations = await manager.query(
        `SELECT COALESCE(SUM(total_days), 0) AS ReservedDays
         FROM leave_requests
         WHERE employee_id = ? AND leave_type_id = ? AND status = 'Pending'
           AND YEAR(start_date) = YEAR(?) AND leave_request_id <> ?`,
        [employeeId, leaveTypeId, startDate, requestId],
      );
      const availableDays =
        Number(balance.totalDays) -
        Number(balance.usedDays) -
        Number(reservations[0].ReservedDays);
      if (totalDays > availableDays) {
        throw new BadRequestException(`The request exceeds your available balance of ${availableDays} days.`);
      }

      const overlaps = await requests
        .createQueryBuilder('request')
        .where('request.employee_id = :employeeId', { employeeId })
        .andWhere('request.status IN (:...statuses)', { statuses: ['Pending', 'Approved'] })
        .andWhere('request.start_date <= :endDate', { endDate })
        .andWhere('request.end_date >= :startDate', { startDate })
        .andWhere('request.leave_request_id <> :requestId', { requestId })
        .getMany();
      if (
        overlaps.some((item) =>
          this.hasWorkingDayOverlap(startDate, endDate, item.startDate, item.endDate),
        )
      ) {
        throw new ConflictException('This leave request overlaps an existing pending or approved request.');
      }

      request.leaveTypeId = leaveTypeId;
      request.startDate = startDate;
      request.endDate = endDate;
      request.totalDays = totalDays;
      request.reason = reason;
      request.documentUrl = documentUrl ?? null;
      const updated = await requests.save(request);
      await manager.getRepository(AuditLogEntity).save({
        actorId: employeeId,
        action: 'leave.updated',
        resourceType: 'leave_request',
        resourceId: String(requestId),
        details: { updatedFields: Object.keys(dto) },
      });

      return this.toLeaveRequest(updated);
    });
  }

  async deleteLeaveRequest(requestId: number, employeeId: number): Promise<{ success: true }> {
    return this.leaveRequestRepository.manager.transaction(async (manager) => {
      const requests = manager.getRepository(LeaveRequestEntity);
      const request = await requests.findOne({
        where: { leaveRequestId: requestId, employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request) {
        throw new NotFoundException('Leave request not found.');
      }
      if (request.status !== 'Pending') {
        throw new ConflictException('Only pending leave requests can be deleted.');
      }

      await manager.getRepository(AuditLogEntity).save({
        actorId: employeeId,
        action: 'leave.deleted',
        resourceType: 'leave_request',
        resourceId: String(requestId),
      });
      await manager.getRepository(LeaveApprovalEntity).delete({ leaveRequestId: requestId });
      await requests.remove(request);
      return { success: true };
    });
  }

  decideApproval(
    approvalId: number,
    approverId: number,
    decision: 'Approved' | 'Rejected',
    remarks: string | null,
  ): Promise<LeaveApproval> {
    return this.leaveApprovalRepository.manager.transaction(async (manager) => {
      const approvals = manager.getRepository(LeaveApprovalEntity);
      const requests = manager.getRepository(LeaveRequestEntity);
      const approval = await approvals.findOne({
        where: { approvalId, approverId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!approval) {
        throw new NotFoundException('Approval record not found');
      }
      if (approval.decision !== 'Pending') {
        throw new ConflictException('This approval has already been decided.');
      }

      const request = await requests.findOne({
        where: { leaveRequestId: approval.leaveRequestId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request || request.status !== 'Pending') {
        throw new NotFoundException('This leave request is no longer awaiting approval.');
      }

      if (approval.approvalLevel > 1) {
        const earlierApprovals = await approvals
          .createQueryBuilder('approval')
          .where('approval.leave_request_id = :requestId', {
            requestId: approval.leaveRequestId,
          })
          .andWhere('approval.approval_level < :level', { level: approval.approvalLevel })
          .getMany();
        if (earlierApprovals.some((item) => item.decision !== 'Approved')) {
          throw new NotFoundException('Earlier approval steps must be approved first.');
        }
      }

      approval.decision = decision;
      approval.remarks = remarks;
      approval.decisionDate = new Date().toISOString().slice(0, 10);
      await approvals.save(approval);
      const relatedApprovals = await approvals.findBy({ leaveRequestId: approval.leaveRequestId });

      const requestStatus =
        decision === 'Rejected'
          ? 'Rejected'
          : relatedApprovals.every((item) => item.decision === 'Approved')
            ? 'Approved'
            : 'Pending';

      request.status = requestStatus;
      await requests.save(request);

      if (requestStatus === 'Approved') {
        const balance = await manager.getRepository(LeaveBalanceEntity).findOne({
          where: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId,
            balanceYear: Number(request.startDate.slice(0, 4)),
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (!balance) {
          throw new ConflictException('Leave balance is missing for the approved request.');
        }
        balance.usedDays = Number(balance.usedDays) + Number(request.totalDays);
        await manager.getRepository(LeaveBalanceEntity).save(balance);
      }

      await manager.getRepository(AuditLogEntity).save({
        actorId: approverId,
        action: `leave.${decision.toLowerCase()}`,
        resourceType: 'leave_approval',
        resourceId: String(approvalId),
      });

      return {
        ApprovalID: approval.approvalId,
        LeaveRequestID: approval.leaveRequestId,
        ApproverID: approval.approverId,
        ApprovalLevel: approval.approvalLevel as 1 | 2,
        Decision: decision,
        Remarks: remarks,
        DecisionDate: approval.decisionDate,
      };
    });
  }

  async createDocument(employeeId: number, documentType: string, file: Express.Multer.File): Promise<OnboardingDocument> {
    if (!file?.buffer?.length || file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Choose a file smaller than 5 MB.');
    }

    const detected = this.detectDocumentType(file.buffer);
    if (!detected) {
      throw new BadRequestException('Only PDF, JPEG, and PNG documents are allowed.');
    }

    const originalFilename = basename(file.originalname)
      .replace(/[\u0000-\u001f\u007f]/g, '_')
      .slice(0, 255);
    if (!originalFilename) {
      throw new BadRequestException('The uploaded file must have a valid filename.');
    }

    const storageKey = `${randomUUID()}${detected.extension}`;
    const storageDirectory = resolve(process.env.UPLOAD_DIR ?? resolve(process.cwd(), 'uploads'));
    const absolutePath = resolve(storageDirectory, storageKey);
    if (!absolutePath.startsWith(`${storageDirectory}${sep}`)) {
      throw new BadRequestException('The uploaded file path is invalid.');
    }

    await mkdir(storageDirectory, { recursive: true });
    await writeFile(absolutePath, file.buffer, { flag: 'wx' });

    try {
      return await this.documentRepository.manager.transaction(async (manager) => {
        const documents = manager.getRepository(OnboardingDocumentEntity);
        const document = await documents.save(
          documents.create({
            employeeId,
            documentType,
            fileUrl: '',
            uploadDate: new Date().toISOString().slice(0, 10),
            verificationStatus: 'Pending',
            verifiedBy: null,
            verifiedDate: null,
            fileStorageKey: storageKey,
            originalFilename,
            fileMimeType: detected.contentType,
            fileSize: file.size,
          }),
        );
        document.fileUrl = `/hr/documents/${document.documentId}/download`;
        await documents.save(document);
        await manager.getRepository(AuditLogEntity).save({
          actorId: employeeId,
          action: 'document.uploaded',
          resourceType: 'onboarding_document',
          resourceId: String(document.documentId),
        });
        return this.toOnboardingDocument(document);
      });
    } catch (error) {
      await rm(absolutePath, { force: true });
      throw error;
    }
  }

  async getDocumentFile(documentId: number, user: AuthenticatedUser): Promise<DocumentFile> {
    const document = await this.documentRepository.findOneBy({ documentId });
    const isAssignedApprover =
      user.Role === 'DepartmentHead' && document
        ? (await this.leaveApprovalRepository
            .createQueryBuilder('approval')
            .innerJoin('approval.leaveRequest', 'request')
            .where('request.employee_id = :employeeId', { employeeId: document.employeeId })
            .andWhere('request.document_url = :fileUrl', { fileUrl: document.fileUrl })
            .andWhere('request.status = :status', { status: 'Pending' })
            .andWhere('approval.approver_id = :approverId', { approverId: user.EmployeeID })
            .andWhere('approval.decision = :decision', { decision: 'Pending' })
            .getCount()) > 0
        : false;
    if (
      !document ||
      (user.Role !== 'HRManager' &&
        document.employeeId !== user.EmployeeID &&
        !(user.Role === 'DepartmentHead' && isAssignedApprover)) ||
      !document.fileStorageKey ||
      basename(document.fileStorageKey) !== document.fileStorageKey ||
      !document.fileMimeType ||
      !document.originalFilename
    ) {
      throw new NotFoundException('Document file not found.');
    }

    const storageDirectory = resolve(process.env.UPLOAD_DIR ?? resolve(process.cwd(), 'uploads'));
    const absolutePath = resolve(storageDirectory, document.fileStorageKey);
    if (!absolutePath.startsWith(`${storageDirectory}${sep}`)) {
      throw new NotFoundException('Document file not found.');
    }
    try {
      await access(absolutePath);
    } catch {
      throw new NotFoundException('Document file is no longer available.');
    }

    return {
      absolutePath,
      contentType: document.fileMimeType,
      filename: document.originalFilename,
    };
  }

  async updateDocumentStatus(
    documentId: number,
    verifierId: number,
    verificationStatus: 'Verified' | 'Rejected',
  ): Promise<OnboardingDocument> {
    return this.documentRepository.manager.transaction(async (manager) => {
      const documents = manager.getRepository(OnboardingDocumentEntity);
      const document = await documents.findOne({
        where: { documentId, verificationStatus: 'Pending' },
        lock: { mode: 'pessimistic_write' },
      });
      if (!document) {
        throw new NotFoundException('Pending document not found.');
      }

      document.verificationStatus = verificationStatus;
      document.verifiedBy = verifierId;
      document.verifiedDate = new Date().toISOString().slice(0, 10);
      const savedDocument = await documents.save(document);
      await manager.getRepository(AuditLogEntity).save({
        actorId: verifierId,
        action: `document.${verificationStatus.toLowerCase()}`,
        resourceType: 'onboarding_document',
        resourceId: String(documentId),
      });
      return this.toOnboardingDocument(savedDocument);
    });
  }

  private toEmployee(employee: EmployeeEntity): Employee {
    return {
      EmployeeID: employee.employeeId,
      DepartmentID: employee.departmentId,
      FirstName: employee.firstName,
      LastName: employee.lastName,
      Email: employee.email,
      Role: employee.role,
      Position: employee.position,
      DateHired: employee.dateHired,
      EmploymentStatus: employee.employmentStatus,
    };
  }

  private toLeaveRequest(
    request: LeaveRequestEntity,
    employee?: EmployeeEntity,
  ): LeaveRequest {
    return {
      LeaveRequestID: request.leaveRequestId,
      EmployeeID: request.employeeId,
      ...(employee
        ? { EmployeeName: `${employee.firstName} ${employee.lastName}` }
        : {}),
      LeaveTypeID: request.leaveTypeId,
      StartDate: request.startDate,
      EndDate: request.endDate,
      TotalDays: Number(request.totalDays),
      Reason: request.reason,
      DocumentURL: request.documentUrl,
      Status: request.status,
      DateSubmitted: request.dateSubmitted,
    };
  }

  private toOnboardingDocument(document: OnboardingDocumentEntity): OnboardingDocument {
    return {
      DocumentID: document.documentId,
      EmployeeID: document.employeeId,
      DocumentType: document.documentType,
      FileURL: document.fileStorageKey
        ? `/hr/documents/${document.documentId}/download`
        : document.fileUrl,
      UploadDate: document.uploadDate,
      VerificationStatus: document.verificationStatus,
      VerifiedBy: document.verifiedBy,
      VerifiedDate: document.verifiedDate,
      OriginalFilename: document.originalFilename,
      FileSize: document.fileSize,
    };
  }

  private daysBetween(startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);
    let workingDays = 0;
    for (let date = start.getTime(); date <= end.getTime(); date += 86400000) {
      const weekday = new Date(date).getUTCDay();
      if (weekday !== 0 && weekday !== 6) workingDays += 1;
    }

    return workingDays;
  }

  private hasWorkingDayOverlap(
    firstStart: string,
    firstEnd: string,
    secondStart: string,
    secondEnd: string,
  ) {
    const overlapStart = firstStart > secondStart ? firstStart : secondStart;
    const overlapEnd = firstEnd < secondEnd ? firstEnd : secondEnd;
    return this.daysBetween(overlapStart, overlapEnd) > 0;
  }

  private detectDocumentType(buffer: Buffer) {
    if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
      return { extension: '.pdf', contentType: 'application/pdf' };
    }
    if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer.subarray(1, 4).toString('ascii') === 'PNG' &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { extension: '.png', contentType: 'image/png' };
    }
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { extension: '.jpg', contentType: 'image/jpeg' };
    }
    return null;
  }
}
