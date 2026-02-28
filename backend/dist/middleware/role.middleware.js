"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = requireRole;
/**
 * Role guard factory — returns middleware that only allows specific roles
 * Usage: requireRole('ADMIN', 'MANAGER')
 */
function requireRole(...roles) {
    return (req, res, next) => {
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
//# sourceMappingURL=role.middleware.js.map