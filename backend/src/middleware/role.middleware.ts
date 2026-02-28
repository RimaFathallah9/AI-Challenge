import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';

/**
 * Role guard factory — returns middleware that only allows specific roles
 * Usage: requireRole('ADMIN', 'MANAGER')
 */
export function requireRole(...roles: Role[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const userRole = req.user?.role;
        if (!userRole || !roles.includes(userRole)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Required role(s): ${roles.join(', ')}`,
            });
        }
        next();
    };
}
