import type { Request } from 'express';
import type { Employee } from '../hr/hr.types';

export type AuthenticatedUser = Pick<
  Employee,
  | 'EmployeeID'
  | 'DepartmentID'
  | 'FirstName'
  | 'LastName'
  | 'Email'
  | 'Role'
  | 'Position'
  | 'DateHired'
  | 'EmploymentStatus'
  | 'MustChangePassword'
>;

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface JwtPayload {
  sub: number;
  email: string;
  tokenVersion: number;
}
