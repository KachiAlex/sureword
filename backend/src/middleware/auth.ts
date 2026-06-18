import { Request } from 'express'

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: string }
}

export function authenticateToken(_req: any, _res: any, next: any) { next() }
export function requireRole(..._roles: string[]) { return (_req: any, _res: any, next: any) => next() }
export const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret'
