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
export declare const authService: {
    register(input: RegisterInput): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            role: import(".prisma/client").$Enums.Role;
            id: string;
            email: string;
            name: string | null;
            createdAt: Date;
        };
    }>;
    login(input: LoginInput): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            role: import(".prisma/client").$Enums.Role;
            id: string;
            email: string;
            name: string | null;
            createdAt: Date;
            updatedAt: Date;
            factoryId: string | null;
        };
    }>;
    refreshToken(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(userId: string): Promise<{
        role: import(".prisma/client").$Enums.Role;
        id: string;
        email: string;
        name: string | null;
        createdAt: Date;
        factoryId: string | null;
    } | null>;
};
//# sourceMappingURL=auth.service.d.ts.map