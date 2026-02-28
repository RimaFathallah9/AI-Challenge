import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
export interface JwtPayload {
    userId: string;
    role: Role;
}
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}
/**
 * Verifies the Bearer JWT and attaches `req.user`
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=auth.middleware.d.ts.map