import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    if (!STATE_CHANGING_METHODS.has(request.method)) return true;

    const origin = request.headers.origin;
    const allowedOrigins = (process.env.FRONTEND_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (!origin || !allowedOrigins.includes(origin)) {
      throw new ForbiddenException('Request origin is not allowed.');
    }

    return true;
  }
}
