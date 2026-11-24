import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { compare, hash } from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuditLogEntity, EmployeeEntity } from '../database/entities';
import type { Employee } from '../hr/hr.types';

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string, clientAddress: string) {
    const normalizedEmail = email.trim().toLowerCase();
    const key = `${clientAddress}:${normalizedEmail}`;
    const now = Date.now();
    const attempts = this.loginAttempts.get(key);
    if (attempts && attempts.resetAt > now && attempts.count >= 5) {
      throw new HttpException('Too many sign-in attempts. Try again in 15 minutes.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const employee = await this.employeeRepository.findOneBy({ email: normalizedEmail });

    if (
      !employee?.passwordHash ||
      employee.employmentStatus === 'Inactive' ||
      !(await compare(password, employee.passwordHash))
    ) {
      this.recordFailedLogin(key, now, attempts);
      throw new UnauthorizedException('Invalid email or password.');
    }

    this.loginAttempts.delete(key);
    const user = this.toPublicUser(employee);
    const accessToken = await this.jwtService.signAsync({
      sub: employee.employeeId,
      email: employee.email,
      tokenVersion: employee.tokenVersion,
    });

    return { accessToken, user };
  }

  async getProfile(employeeId: number) {
    const employee = await this.employeeRepository.findOneBy({ employeeId });
    if (!employee) {
      throw new UnauthorizedException('The account associated with this session is no longer available.');
    }

    return this.toPublicUser(employee);
  }

  async changePassword(employeeId: number, currentPassword: string, newPassword: string) {
    const employee = await this.employeeRepository.findOneBy({ employeeId });
    if (
      !employee?.passwordHash ||
      !(await compare(currentPassword, employee.passwordHash))
    ) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    if (await compare(newPassword, employee.passwordHash)) {
      throw new ConflictException('Choose a new password that you have not used for this account.');
    }

    const passwordHash = await hash(newPassword, 12);
    const updatedEmployee = await this.employeeRepository.manager.transaction(async (manager) => {
      const employees = manager.getRepository(EmployeeEntity);
      const currentEmployee = await employees.findOne({
        where: { employeeId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentEmployee || currentEmployee.tokenVersion !== employee.tokenVersion) {
        throw new ConflictException('Your account changed while updating the password. Please sign in again.');
      }

      currentEmployee.passwordHash = passwordHash;
      currentEmployee.mustChangePassword = false;
      currentEmployee.tokenVersion += 1;
      const savedEmployee = await employees.save(currentEmployee);
      await manager.getRepository(AuditLogEntity).save({
        actorId: employeeId,
        action: 'password.changed',
        resourceType: 'employee',
        resourceId: String(employeeId),
      });
      return savedEmployee;
    });
    const updatedUser = this.toPublicUser(updatedEmployee);
    const accessToken = await this.jwtService.signAsync({
      sub: updatedEmployee.employeeId,
      email: updatedEmployee.email,
      tokenVersion: updatedEmployee.tokenVersion,
    });

    return { accessToken, user: updatedUser };
  }

  private toPublicUser(employee: EmployeeEntity): Employee {
    const {
      employeeId,
      departmentId,
      firstName,
      lastName,
      email,
      role,
      position,
      dateHired,
      employmentStatus,
      mustChangePassword,
    } = employee;
    return {
      EmployeeID: employeeId,
      DepartmentID: departmentId,
      FirstName: firstName,
      LastName: lastName,
      Email: email,
      Role: role,
      Position: position,
      DateHired: dateHired,
      EmploymentStatus: employmentStatus,
      MustChangePassword: Boolean(mustChangePassword),
    };
  }

  private recordFailedLogin(
    key: string,
    now: number,
    attempts: { count: number; resetAt: number } | undefined,
  ) {
    for (const [attemptKey, entry] of this.loginAttempts) {
      if (entry.resetAt <= now) this.loginAttempts.delete(attemptKey);
    }
    if (this.loginAttempts.size >= 10000 && !attempts) {
      throw new HttpException('Sign-in is temporarily unavailable. Try again shortly.', HttpStatus.TOO_MANY_REQUESTS);
    }

    if (!attempts || attempts.resetAt <= now) {
      this.loginAttempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 });
    } else {
      attempts.count += 1;
    }
  }

}
