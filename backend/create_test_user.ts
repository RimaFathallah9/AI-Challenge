import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('test', 10);
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
