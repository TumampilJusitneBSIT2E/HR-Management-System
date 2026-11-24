import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { createReadStream } from 'node:fs';
import type { Response } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { HrService } from './hr.service';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { DecideApprovalDto } from './dto/decide-approval.dto';
import { UpdateDocumentStatusDto } from './dto/update-document-status.dto';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';

@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  @Get('health')
  @Public()
  health() {
    return { status: 'ok' };
  }

  @Get('employees')
  @Roles('HRManager')
  getEmployees() {
    return this.hrService.getEmployees();
  }

  @Get('employees/:employeeId')
  @Roles('HRManager')
  getEmployee(@Param('employeeId', ParseIntPipe) employeeId: number) {
    return this.hrService.getEmployee(employeeId);
  }

  @Post('employees')
  @Roles('HRManager')
  createEmployee(@Body() dto: CreateEmployeeDto, @Req() request: AuthenticatedRequest) {
    return this.hrService.createEmployee(dto, request.user.EmployeeID);
  }

  @Patch('employees/:employeeId/deactivate')
  @Roles('HRManager')
  deactivateEmployee(@Param('employeeId') employeeId: string, @Req() request: AuthenticatedRequest) {
    return this.hrService.deactivateEmployee(Number(employeeId), request.user.EmployeeID);
  }

  @Patch('employees/:employeeId')
  @Roles('HRManager')
  updateEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.hrService.updateEmployee(employeeId, dto);
  }

  @Delete('employees/:employeeId')
  @Roles('HRManager')
  deleteEmployee(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.hrService.deactivateEmployee(employeeId, request.user.EmployeeID);
  }

  @Get('departments')
  getDepartments() {
    return this.hrService.getDepartments();
  }

  @Get('leave-types')
  getLeaveTypes() {
    return this.hrService.getLeaveTypes();
  }

  @Get('leave-balances')
  getLeaveBalances(@Req() request: AuthenticatedRequest) {
    return this.hrService.getLeaveBalances(
      request.user.Role === 'HRManager' ? undefined : request.user.EmployeeID,
    );
  }

  @Get('leave-requests')
  getLeaveRequests(@Req() request: AuthenticatedRequest) {
    return this.hrService.getLeaveRequests(request.user);
  }

  @Get('leave-requests/:requestId')
  getLeaveRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.hrService.getLeaveRequest(requestId, request.user);
  }

  @Post('leave-requests')
  createLeaveRequest(@Body() dto: CreateLeaveRequestDto, @Req() request: AuthenticatedRequest) {
    return this.hrService.createLeaveRequest(dto, request.user.EmployeeID);
  }

  @Patch('leave-requests/:requestId')
  updateLeaveRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Body() dto: UpdateLeaveRequestDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.hrService.updateLeaveRequest(requestId, dto, request.user.EmployeeID);
  }

  @Delete('leave-requests/:requestId')
  deleteLeaveRequest(
    @Param('requestId', ParseIntPipe) requestId: number,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.hrService.deleteLeaveRequest(requestId, request.user.EmployeeID);
  }

  @Get('approvals')
  getApprovals(@Req() request: AuthenticatedRequest) {
    return this.hrService.getApprovals(request.user.EmployeeID);
  }

  @Put('approvals/:approvalId')
  @Roles('DepartmentHead', 'HRManager')
  decideApproval(
    @Param('approvalId') approvalId: string,
    @Body() body: DecideApprovalDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.hrService.decideApproval(
      Number(approvalId),
      request.user.EmployeeID,
      body.decision,
      body.remarks ?? null,
    );
  }

  @Get('documents')
  getDocuments(@Req() request: AuthenticatedRequest) {
    return this.hrService.getDocuments(
      request.user.Role === 'HRManager' ? undefined : request.user.EmployeeID,
    );
  }

  @Post('documents')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }),
  )
  createDocument(
    @Body() body: CreateDocumentDto,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.hrService.createDocument(request.user.EmployeeID, body.DocumentType, file);
  }

  @Post('employees/:employeeId/password-reset')
  @Roles('HRManager')
  resetEmployeePassword(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.setHeader('Cache-Control', 'no-store');
    return this.hrService.resetEmployeePassword(employeeId, request.user.EmployeeID);
  }

  @Get('documents/:documentId/download')
  async downloadDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.hrService.getDocumentFile(documentId, request.user);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const filename = encodeURIComponent(file.filename);
    return new StreamableFile(createReadStream(file.absolutePath), {
      type: file.contentType,
      disposition: `attachment; filename*=UTF-8''${filename}`,
    });
  }

  @Patch('documents/:documentId/verification')
  @Roles('HRManager')
  updateDocumentStatus(
    @Param('documentId') documentId: string,
    @Body() dto: UpdateDocumentStatusDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.hrService.updateDocumentStatus(
      Number(documentId),
      request.user.EmployeeID,
      dto.VerificationStatus,
    );
  }
}
