import { SetMetadata } from '@nestjs/common';
import type { Employee } from '../../hr/hr.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Employee['Role'][]) => SetMetadata(ROLES_KEY, roles);
