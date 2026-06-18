import { Request } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare function authenticateToken(_req: any, _res: any, next: any): void;
export declare function requireRole(..._roles: string[]): (_req: any, _res: any, next: any) => any;
export declare const JWT_SECRET: string;
export declare const JWT_REFRESH_SECRET: string;
//# sourceMappingURL=auth.d.ts.map