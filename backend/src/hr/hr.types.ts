export interface Department {
  DepartmentID: number;
  DepartmentName: string;
  DepartmentHeadID: number;
}

export interface Employee {
  EmployeeID: number;
  DepartmentID: number;
  FirstName: string;
  LastName: string;
  Email: string;
  Role: 'Employee' | 'DepartmentHead' | 'HRManager';
  Position: string;
  DateHired: string;
  EmploymentStatus: string;
  MustChangePassword?: boolean;
}

export interface LeaveType {
  LeaveTypeID: number;
  LeaveTypeName: string;
  DefaultDays: number;
  RequiresDocument: boolean;
}

export interface LeaveBalance {
  LeaveBalanceID: number;
  EmployeeID: number;
  LeaveTypeID: number;
  BalanceYear: number;
  TotalDays: number;
  UsedDays: number;
  ReservedDays?: number;
}

export interface LeaveRequest {
  LeaveRequestID: number;
  EmployeeID: number;
  LeaveTypeID: number;
  StartDate: string;
  EndDate: string;
  TotalDays: number;
  Reason: string;
  DocumentURL: string | null;
  Status: 'Pending' | 'Approved' | 'Rejected';
  DateSubmitted: string;
  EmployeeName?: string;
}

export interface LeaveApproval {
  ApprovalID: number;
  LeaveRequestID: number;
  ApproverID: number;
  ApprovalLevel: 1 | 2;
  Decision: 'Pending' | 'Approved' | 'Rejected';
  Remarks: string | null;
  DecisionDate: string | null;
}

export interface OnboardingDocument {
  DocumentID: number;
  EmployeeID: number;
  DocumentType: string;
  FileURL: string;
  UploadDate: string;
  VerificationStatus: 'Pending' | 'Verified' | 'Rejected';
  VerifiedBy: number | null;
  VerifiedDate: string | null;
  OriginalFilename?: string | null;
  FileSize?: number | null;
}

export const seedData = {
  departments: [
    { DepartmentID: 1, DepartmentName: 'Human Resources', DepartmentHeadID: 2 },
    { DepartmentID: 2, DepartmentName: 'Information Technology', DepartmentHeadID: 3 },
  ],
  employees: [
    { EmployeeID: 1, DepartmentID: 2, FirstName: 'Maria', LastName: 'Santos', Email: 'maria.santos@company.ph', Role: 'Employee', Position: 'Junior Developer', DateHired: '2026-09-01', EmploymentStatus: 'Onboarding' },
    { EmployeeID: 2, DepartmentID: 1, FirstName: 'Liza', LastName: 'Ramos', Email: 'liza.ramos@company.ph', Role: 'HRManager', Position: 'HR Manager', DateHired: '2022-03-14', EmploymentStatus: 'Active' },
    { EmployeeID: 3, DepartmentID: 2, FirstName: 'Jose', LastName: 'Cruz', Email: 'jose.cruz@company.ph', Role: 'DepartmentHead', Position: 'IT Manager', DateHired: '2020-06-01', EmploymentStatus: 'Active' },
  ],
  leaveTypes: [
    { LeaveTypeID: 1, LeaveTypeName: 'Vacation', DefaultDays: 15, RequiresDocument: false },
    { LeaveTypeID: 2, LeaveTypeName: 'Sick', DefaultDays: 10, RequiresDocument: true },
    { LeaveTypeID: 3, LeaveTypeName: 'Emergency', DefaultDays: 5, RequiresDocument: false },
  ],
  leaveBalances: [] as LeaveBalance[],
  leaveRequests: [
    { LeaveRequestID: 1, EmployeeID: 1, LeaveTypeID: 1, StartDate: '2026-10-26', EndDate: '2026-10-28', TotalDays: 3, Reason: 'Family trip', DocumentURL: null, Status: 'Pending', DateSubmitted: '2026-10-15' },
  ],
  leaveApprovals: [
    { ApprovalID: 1, LeaveRequestID: 1, ApproverID: 3, ApprovalLevel: 1, Decision: 'Pending', Remarks: null, DecisionDate: null },
    { ApprovalID: 2, LeaveRequestID: 1, ApproverID: 2, ApprovalLevel: 2, Decision: 'Pending', Remarks: null, DecisionDate: null },
  ],
  onboardingDocuments: [
    { DocumentID: 1, EmployeeID: 1, DocumentType: 'Valid ID', FileURL: 'drive://valid-id.pdf', UploadDate: '2026-09-02', VerificationStatus: 'Verified', VerifiedBy: 2, VerifiedDate: '2026-09-03' },
    { DocumentID: 2, EmployeeID: 1, DocumentType: 'Signed Contract', FileURL: 'drive://contract.pdf', UploadDate: '2026-09-02', VerificationStatus: 'Pending', VerifiedBy: null, VerifiedDate: null },
  ],
};

seedData.leaveBalances = seedData.employees.flatMap((employee) =>
  seedData.leaveTypes.map((leaveType) => ({
    LeaveBalanceID: employee.EmployeeID * 10 + leaveType.LeaveTypeID,
    EmployeeID: employee.EmployeeID,
    LeaveTypeID: leaveType.LeaveTypeID,
    BalanceYear: 2026,
    TotalDays: leaveType.DefaultDays,
    UsedDays: 0,
  })),
);
