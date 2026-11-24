import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity } from '../database/entities';
import type { AuthenticatedUser, JwtPayload } from './auth.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeeRepository: Repository<EmployeeEntity>,
  ) {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) {
      throw new Error('JWT_SECRET must be set to a random value of at least 32 characters.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: { cookies?: Record<string, string> }) => request?.cookies?.hr_session ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });

  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const employee = await this.employeeRepository.findOneBy({ employeeId: payload.sub });

    if (
      !employee ||
      employee.email.toLowerCase() !== payload.email.toLowerCase() ||
      employee.employmentStatus === 'Inactive' ||
      Number(employee.tokenVersion) !== Number(payload.tokenVersion)
    ) {
      throw new UnauthorizedException('The account associated with this session is no longer available.');
    }

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
      MustChangePassword: Boolean(employee.mustChangePassword),
    };
  }
}
