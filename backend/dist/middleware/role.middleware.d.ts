import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
/**
 * Role guard factory — returns middleware that only allows specific roles
 * Usage: requireRole('ADMIN', 'MANAGER')
 */
export declare function requireRole(...roles: Role[]): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=role.middleware.d.ts.map