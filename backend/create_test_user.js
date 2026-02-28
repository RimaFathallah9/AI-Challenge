"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    const hashedPassword = await bcryptjs_1.default.hash('test', 10);
    await prisma.user.upsert({
        where: { email: 'test@gmail.com' },
        update: { password: hashedPassword, role: 'ADMIN' },
        create: {
            email: 'test@gmail.com',
            password: hashedPassword,
            name: 'Test Administrator',
            role: 'ADMIN'
        }
    });
    console.log('User test@gmail.com configured with password test');
}
main().catch(console.error).finally(() => prisma.$disconnect());
