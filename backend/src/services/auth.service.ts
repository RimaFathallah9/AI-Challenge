import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma/client';
import { config } from '../config/env';
import { Role } from '@prisma/client';

export interface RegisterInput {
    email: string;
    password: string;
    name?: string;
    role?: Role;
    factoryId?: string;
}

export interface LoginInput {
    email: string;
    password: string;
}

// Sign access and refresh tokens
function signTokens(userId: string, role: Role) {
    const accessToken = jwt.sign(
        { userId, role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );
    const refreshToken = jwt.sign(
        { userId, role },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn as jwt.SignOptions['expiresIn'] }
    );
    return { accessToken, refreshToken };
}

export const authService = {
    async register(input: RegisterInput) {
        const exists = await prisma.user.findUnique({ where: { email: input.email } });
        if (exists) throw new Error('Email already registered');

        const hashed = await bcrypt.hash(input.password, 12);

        const user = await prisma.user.create({
            data: {
                email: input.email,
                password: hashed,
                name: input.name,
                role: input.role || Role.TECHNICIAN,
                factoryId: input.factoryId || null,
            },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });

        const tokens = signTokens(user.id, user.role);
        return { user, ...tokens };
    },

    async login(input: LoginInput) {
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        if (!user) throw new Error('Invalid credentials');

        const valid = await bcrypt.compare(input.password, user.password);
        if (!valid) throw new Error('Invalid credentials');

        const tokens = signTokens(user.id, user.role);
        const { password: _pw, ...safeUser } = user;
        return { user: safeUser, ...tokens };
    },

    async refreshToken(token: string) {
        const decoded = jwt.verify(token, config.jwtRefreshSecret) as { userId: string; role: Role };
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user) throw new Error('User not found');
        return signTokens(user.id, user.role);
    },

    async getProfile(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, name: true, role: true, factoryId: true, createdAt: true },
        });
    },
};
