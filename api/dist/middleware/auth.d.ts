import { Request, Response, NextFunction } from 'express';
export declare const JWT_SECRET: string;
export declare const JWT_REFRESH_SECRET: string;
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        name: string;
        role: string;
    };
}
export declare function generateTokens(user: {
    id: string;
    email: string;
    name: string;
    role: string;
}): {
    accessToken: string;
    refreshToken: string;
};
export declare function storeRefreshToken(userId: string, refreshToken: string): Promise<void>;
export declare function verifyRefreshToken(token: string): Promise<{
    id: string;
} | null>;
export declare function revokeRefreshToken(token: string): Promise<void>;
export declare function revokeAllUserTokens(userId: string): Promise<void>;
export declare function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export declare function requireRole(...roles: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map