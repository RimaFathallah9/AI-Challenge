"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("./client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// ══════════════════════════════════════════════════════════════════════════════
// COMPREHENSIVE TEST DATASET FOR ALL AI MODELS
// ══════════════════════════════════════════════════════════════════════════════
async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding with comprehensive test data...\n');
        // ──────────────────────────────────────────────────────────────────────
        // 1. CREATE ADMIN USER
        // ──────────────────────────────────────────────────────────────────────
        const adminPassword = await bcryptjs_1.default.hash('admin123', 10);
        const admin = await client_1.prisma.user.upsert({
            where: { email: 'admin@nexova.com' },
            update: {},
            create: {
                email: 'admin@nexova.com',
                password: adminPassword,
                name: 'Admin User',
                role: 'ADMIN',
            },
        });
        console.log('✓ Admin user created:', admin.email);
        // ──────────────────────────────────────────────────────────────────────
        // 2. CREATE FACTORY
        // ──────────────────────────────────────────────────────────────────────
        const factory = await client_1.prisma.factory.upsert({
            where: { id: 'test-factory-001' },
            update: {},
            create: {
                id: 'test-factory-001',
                name: 'NEXOVA Test Factory',
                location: 'Test Location',
            },
        });
        console.log('✓ Factory created:', factory.name);
        // ──────────────────────────────────────────────────────────────────────
        // 3. CREATE MACHINES WITH DIFFERENT PROFILES
        // ──────────────────────────────────────────────────────────────────────
        const machineConfigs = [
            {
                id: 'machine-pump-001',
                name: 'Pump A-100',
                type: 'PUMP',
                status: 'ONLINE',
                normalPower: 12.5,
                normalTemp: 65,
                normalVibration: 1.8,
            },
            {
                id: 'machine-motor-001',
                name: 'Motor M-50',
                type: 'MOTOR',
                status: 'ONLINE',
                normalPower: 18.0,
                normalTemp: 72,
                normalVibration: 2.2,
            },
            {
                id: 'machine-compressor-001',
                name: 'Compressor C-75',
                type: 'COMPRESSOR',
                status: 'ONLINE',
                normalPower: 24.5,
                normalTemp: 68,
                normalVibration: 2.5,
            },
            {
                id: 'machine-conveyor-001',
                name: 'Conveyor B-200',
                type: 'CONVEYOR',
                status: 'WARNING',
                normalPower: 6.5,
                normalTemp: 58,
                normalVibration: 1.5,
            },
            {
                id: 'machine-cnc-001',
                name: 'CNC Machine X-1000',
                type: 'CNC Machine',
                status: 'ONLINE',
                normalPower: 28.0,
                normalTemp: 75,
                normalVibration: 3.0,
            },
        ];
        const machines = [];
        for (const config of machineConfigs) {
            const machine = await client_1.prisma.machine.upsert({
                where: { id: config.id },
                update: {
                    status: config.status,
                },
                create: {
                    id: config.id,
                    name: config.name,
                    type: config.type,
                    status: config.status,
                    factoryId: factory.id,
                    createdById: admin.id,
                },
            });
            machines.push({ ...config, machine });
            console.log(`✓ Machine created: ${config.name} (${config.type})`);
        }
        // ──────────────────────────────────────────────────────────────────────
        // 4. CREATE REALISTIC ENERGY READINGS FOR EACH MACHINE
        // ──────────────────────────────────────────────────────────────────────
        console.log('\n📊 Generating 168 hours of realistic sensor data...');
        for (const machineConfig of machineConfigs) {
            const readings = [];
            const now = new Date();
            // Generate 168 readings (7 days, hourly)
            for (let i = 0; i < 168; i++) {
                const timestamp = new Date(now.getTime() - (168 - i) * 60 * 60 * 1000);
                // Simulate realistic variations
                const timeOfDay = (timestamp.getHours() + 6) % 24; // 6-hour offset for day cycle
                const isNightShift = timeOfDay < 8 || timeOfDay > 18;
                const dayVariation = Math.sin((i / 168) * Math.PI * 2) * 0.2; // Weekly cycle
                // Generate realistic values with variation
                const powerVariation = (Math.random() - 0.5) * 0.2 + dayVariation;
                const tempVariation = (Math.random() - 0.5) * 5 + (isNightShift ? -3 : 2);
                const vibVariation = (Math.random() - 0.5) * 0.4 + dayVariation * 0.3;
                readings.push({
                    machineId: machineConfig.id,
                    power: Math.max(0.5, machineConfig.normalPower * (1 + powerVariation)),
                    temperature: Math.max(20, machineConfig.normalTemp + tempVariation),
                    vibration: Math.max(0, machineConfig.normalVibration * (1 + vibVariation)),
                    production: isNightShift ? machineConfig.normalPower * 0.3 : machineConfig.normalPower * 1.2,
                    runtime: i + 1,
                    timestamp,
                    voltage: 415 + (Math.random() - 0.5) * 10,
                    current: machineConfig.normalPower / 0.85,
                });
            }
            // Insert in batches
            await client_1.prisma.energyReading.createMany({
                data: readings,
                skipDuplicates: true,
            });
            console.log(`  ✓ ${readings.length} readings for ${machineConfig.name}`);
        }
        // ──────────────────────────────────────────────────────────────────────
        // 5. CREATE SAMPLE ALERTS
        // ──────────────────────────────────────────────────────────────────────
        console.log('\n⚠️ Creating sample alerts...');
        const alerts = [
            {
                machineId: 'machine-conveyor-001',
                message: 'Elevated temperature trend detected',
                severity: 'MEDIUM',
                resolved: false,
                createdById: admin.id,
            },
            {
                machineId: 'machine-motor-001',
                message: 'Abnormal vibration pattern detected',
                severity: 'HIGH',
                resolved: false,
                createdById: admin.id,
            },
        ];
        for (const alertData of alerts) {
            await client_1.prisma.alert.create({
                data: alertData,
            });
        }
        console.log(`✓ Created ${alerts.length} sample alerts`);
        // ──────────────────────────────────────────────────────────────────────
        // 6. PRINT SUMMARY STATISTICS
        // ──────────────────────────────────────────────────────────────────────
        const totalReadings = await client_1.prisma.energyReading.count();
        const totalMachines = await client_1.prisma.machine.count();
        const totalAlerts = await client_1.prisma.alert.count();
        console.log('\n' + '═'.repeat(70));
        console.log('📈 DATABASE SEEDING COMPLETE');
        console.log('═'.repeat(70));
        console.log(`\nSummary Statistics:`);
        console.log(`  • Total Machines: ${totalMachines}`);
        console.log(`  • Total Sensor Readings: ${totalReadings}`);
        console.log(`  • Total Alerts: ${totalAlerts}`);
        console.log(`  • Data Coverage: 7 days (168 hours)`);
        console.log(`\nMachine Inventory:`);
        // List each machine with their latest metrics
        const machinesWithLatest = await client_1.prisma.machine.findMany({
            include: {
                energyReadings: {
                    orderBy: { timestamp: 'desc' },
                    take: 1,
                },
            },
        });
        for (const m of machinesWithLatest) {
            const latest = m.energyReadings[0];
            console.log(`\n  ├─ ${m.name} (${m.type})`);
            console.log(`  │  ├─ Status: ${m.status}`);
            if (latest) {
                console.log(`  │  ├─ Power: ${latest.power.toFixed(1)} kW`);
                console.log(`  │  ├─ Temp: ${latest.temperature.toFixed(1)}°C`);
                console.log(`  │  └─ Vibration: ${latest.vibration.toFixed(2)} mm/s`);
            }
        }
        console.log('\n' + '═'.repeat(70));
        console.log('✅ All AI models now have realistic training data!');
        console.log('═'.repeat(70));
        console.log('\nYou can now test the AI models with these machines:');
        machineConfigs.forEach(m => {
            console.log(`  • ${m.id}`);
        });
    }
    catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    }
    finally {
        await client_1.prisma.$disconnect();
    }
}
// Run the seed
seedDatabase();
//# sourceMappingURL=comprehensive-seed.js.map