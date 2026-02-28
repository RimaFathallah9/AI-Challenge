import { PrismaClient, Role, MachineStatus, AlertSeverity } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding NEXOVA database...');

    // Create factory
    const factory = await prisma.factory.upsert({
        where: { id: 'default-factory-id' },
        update: {},
        create: {
            id: 'default-factory-id',
            name: 'NEXOVA Main Factory',
            location: 'Industrial Zone A, Berlin',
        },
    });

    // Create users
    const adminPw = await bcrypt.hash('Admin1234!', 12);
    await prisma.user.upsert({
        where: { email: 'admin@nexova.io' },
        update: {},
        create: {
            email: 'admin@nexova.io',
            password: adminPw,
            name: 'Admin User',
            role: Role.ADMIN,
            factoryId: factory.id,
        },
    });

    const managerPw = await bcrypt.hash('Manager1234!', 12);
    await prisma.user.upsert({
        where: { email: 'manager@nexova.io' },
        update: {},
        create: {
            email: 'manager@nexova.io',
            password: managerPw,
            name: 'Energy Manager',
            role: Role.MANAGER,
            factoryId: factory.id,
        },
    });

    // Create machines
    const machineData = [
        { name: 'Hydraulic Press 45/TX-21', type: 'Hydraulic Press', status: MachineStatus.ONLINE },
        { name: 'CNC Machine Alpha-3', type: 'CNC Machine', status: MachineStatus.ONLINE },
        { name: 'Conveyor Belt B7', type: 'Conveyor Belt', status: MachineStatus.WARNING },
        { name: 'Air Compressor C12', type: 'Air Compressor', status: MachineStatus.ONLINE },
        { name: 'Welding Robot RW-9', type: 'Welding Robot', status: MachineStatus.MAINTENANCE },
        { name: 'CNC Machine Beta-7', type: 'CNC Machine', status: MachineStatus.ONLINE },
    ];

    const machines = [];
    for (const m of machineData) {
        const machine = await prisma.machine.create({
            data: { ...m, factoryId: factory.id },
        });
        machines.push(machine);
    }

    // Seed 7 days of historical energy readings (hourly)
    const now = new Date();
    for (const machine of machines) {
        const base = { 'Hydraulic Press': { v: 400, c: 85, p: 34, t: 72 }, 'CNC Machine': { v: 220, c: 45, p: 9.9, t: 45 }, 'Conveyor Belt': { v: 380, c: 30, p: 11.4, t: 38 }, 'Air Compressor': { v: 400, c: 60, p: 24, t: 65 }, 'Welding Robot': { v: 300, c: 120, p: 36, t: 80 } }[machine.type] || { v: 220, c: 45, p: 9.9, t: 45 };
        const readings = [];
        for (let i = 7 * 24; i >= 0; i--) {
            const ts = new Date(now.getTime() - i * 3600000);
            readings.push({
                machineId: machine.id,
                voltage: base.v + (Math.random() - 0.5) * 10,
                current: base.c + (Math.random() - 0.5) * 5,
                power: base.p + (Math.random() - 0.5) * 3,
                temperature: base.t + (Math.random() - 0.5) * 5,
                runtime: parseFloat((Math.random() * 8 + 1).toFixed(2)),
                timestamp: ts,
            });
        }
        await prisma.energyReading.createMany({ data: readings });
    }

    // Seed sample alerts
    const alertMessages = [
        { message: 'High Consumption in Department B', severity: AlertSeverity.HIGH, details: 'Power draw exceeds normal threshold by 40%.' },
        { message: 'Machine X is operating at 80% efficiency. Check for potential issues.', severity: AlertSeverity.MEDIUM, details: 'Efficiency below optimal range.' },
        { message: 'Alarm Machine X performance dropping — currently at 60%, investigate possible causes', severity: AlertSeverity.CRITICAL, details: 'Machine X performance dropping — currently at 60% efficiency, which is below the critical threshold of 65%. Recommended Actions: Immediately check the machine electrical connections. Check lubrication levels. Ensure the machine is properly calibrated. Verify system parameters and update software if needed.' },
        { message: 'High Temperature warning on Air Compressor', severity: AlertSeverity.MEDIUM, details: 'Temperature exceeds safe operating limit.' },
    ];

    for (const a of alertMessages) {
        await prisma.alert.create({ data: { ...a, machineId: machines[0].id } });
    }

    console.log('✅ Seed complete!');
    console.log('   🔑 Admin:   admin@nexova.io / Admin1234!');
    console.log('   🔑 Manager: manager@nexova.io / Manager1234!');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
