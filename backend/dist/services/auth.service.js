"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const client_1 = require("../prisma/client");
const env_1 = require("../config/env");
const client_2 = require("@prisma/client");
// Sign access and refresh tokens
function signTokens(userId, role) {
    const accessToken = jsonwebtoken_1.default.sign({ userId, role }, env_1.config.jwtSecret, { expiresIn: env_1.config.jwtExpiresIn });
    const refreshToken = jsonwebtoken_1.default.sign({ userId, role }, env_1.config.jwtRefreshSecret, { expiresIn: env_1.config.jwtRefreshExpiresIn });
    return { accessToken, refreshToken };
}
exports.authService = {
    async register(input) {
        const exists = await client_1.prisma.user.findUnique({ where: { email: input.email } });
        if (exists)
            throw new Error('Email already registered');
        const hashed = await bcryptjs_1.default.hash(input.password, 12);
        const user = await client_1.prisma.user.create({
            data: {
                email: input.email,
                password: hashed,
                name: input.name,
                role: input.role || client_2.Role.TECHNICIAN,
                factoryId: input.factoryId || null,
            },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        const tokens = signTokens(user.id, user.role);
        return { user, ...tokens };
    },
    async login(input) {
        const user = await client_1.prisma.user.findUnique({ where: { email: input.email } });
        if (!user)
            throw new Error('Invalid credentials');
        const valid = await bcryptjs_1.default.compare(input.password, user.password);
        if (!valid)
            throw new Error('Invalid credentials');
        const tokens = signTokens(user.id, user.role);
        const { password: _pw, ...safeUser } = user;
        return { user: safeUser, ...tokens };
    },
    async refreshToken(token) {
        const decoded = jsonwebtoken_1.default.verify(token, env_1.config.jwtRefreshSecret);
        const user = await client_1.prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user)
            throw new Error('User not found');
        return signTokens(user.id, user.role);
    },
    async getProfile(userId) {
        return client_1.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true, factoryId: true, createdAt: true },
        });
    },
};
//# sourceMappingURL=auth.service.js.map