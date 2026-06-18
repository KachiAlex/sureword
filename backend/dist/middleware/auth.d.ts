import { Request, Response, NextFunction } from 'express';
export declare const JWT_SECRET: string;
export declare const JWT_REFRESH_SECRET: string;
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}
export declare function authenticateToken(req: AuthRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: string[]): (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map