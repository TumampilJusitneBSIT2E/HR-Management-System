import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { DatabaseModule } from '../database/database.module';
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

@Module({
  imports: [
    DatabaseModule,
    TypeOrmModule.forFeature([
      AuditLogEntity,
      DepartmentEntity,
      EmployeeEntity,
      LeaveApprovalEntity,
      LeaveBalanceEntity,
      LeaveRequestEntity,
      LeaveTypeEntity,
      OnboardingDocumentEntity,
    ]),
  ],
  controllers: [HrController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
