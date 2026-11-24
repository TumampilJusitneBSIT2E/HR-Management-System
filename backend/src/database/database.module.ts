import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import {
  AuditLogEntity,
  DepartmentEntity,
  EmployeeEntity,
  LeaveApprovalEntity,
  LeaveBalanceEntity,
  LeaveRequestEntity,
  LeaveTypeEntity,
  OnboardingDocumentEntity,
} from './entities';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST ?? '127.0.0.1',
      port: Number(process.env.DB_PORT ?? 3306),
      username: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME ?? 'hr_system',
      entities: [
        DepartmentEntity,
        EmployeeEntity,
        LeaveTypeEntity,
        LeaveBalanceEntity,
        LeaveRequestEntity,
        LeaveApprovalEntity,
        OnboardingDocumentEntity,
        AuditLogEntity,
      ],
      synchronize: false,
      logging: false,
      extra: { dateStrings: true, decimalNumbers: true },
    }),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
