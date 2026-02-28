import { prisma } from '../prisma/client';

// Machine type profiles for realistic sensor simulation
const MACHINE_PROFILES: Record<string, { temp: number; power: number; vibration: number }> = {
    'Hydraulic Press': { temp: 72, power: 34, vibration: 2.5 },
    'CNC Machine': { temp: 45, power: 9.9, vibration: 1.2 },
    'Conveyor Belt': { temp: 38, power: 11.4, vibration: 0.8 },
    'Air Compressor': { temp: 65, power: 24, vibration: 3.1 },
    'Welding Robot': { temp: 80, power: 36, vibration: 1.5 },
};

type SensorReading = {
    machineId: string;
    machineName: string;
    machineType: string;
    temperature: number;
    powerUsage: number;
    vibration: number;
    machineStatus: string;
    timestamp: string;
};

function noise(base: number, pct = 0.08): number {
    return parseFloat((base * (1 + (Math.random() - 0.5) * 2 * pct)).toFixed(2));
}

let sensorInterval: ReturnType<typeof setInterval> | null = null;

// Callback to push readings to connected WebSocket clients
let broadcastFn: ((data: any) => void) | null = null;

export const sensorService = {
    setBroadcast(fn: (data: any) => void) {
        broadcastFn = fn;
    },

    /**
     * Generate ~1000 historical readings (represents ~33 minutes of data at 2s intervals)
     * This creates realistic data close to baseline values for AI model training
     */
    async generateHistoricalData() {
        try {
            console.log('📊 Generating 1000+ historical energy readings...');
            
            const machines = await prisma.machine.findMany({
                select: { id: true, name: true, type: true },
            });

            if (!machines.length) {
                console.log('⚠️ No machines found. Skipping historical data generation.');
                return;
            }

            const now = new Date();
            const historicalReadings: any[] = [];
            
            // Generate 1000 readings per machine, spaced 2 seconds apart
            for (const machine of machines) {
                const profile = MACHINE_PROFILES[machine.type] || MACHINE_PROFILES['CNC Machine'];

                for (let i = 1000; i > 0; i--) {
                    const timestamp = new Date(now.getTime() - i * 2000); // Each reading is 2 seconds apart
                    
                    historicalReadings.push({
                        machineId: machine.id,
                        voltage: noise(profile.temp < 50 ? 220 : 380, 0.06),
                        current: noise(profile.power / 0.38, 0.07),
                        power: noise(profile.power, 0.08), // Realistic power consumption with small variations
                        temperature: noise(profile.temp, 0.06), // Temperature close to baseline
                        vibration: noise(profile.vibration, 0.05),
                        production: Math.random() * profile.power * 10,
                        runtime: parseFloat((Math.random() * 8 + 1).toFixed(2)),
                        timestamp,
                    });
                }
            }

            // Batch insert all readings
            const batchSize = 500;
            for (let i = 0; i < historicalReadings.length; i += batchSize) {
                const batch = historicalReadings.slice(i, i + batchSize);
                await prisma.energyReading.createMany({
                    data: batch,
                    skipDuplicates: true,
                });
                console.log(`  ✓ Inserted ${Math.min(batchSize, batch.length)}/${historicalReadings.length} readings`);
            }

            const totalReadings = historicalReadings.length;
            console.log(`✅ Historical data generation complete! Generated ${totalReadings} readings`);
            console.log(`   (${machines.length} machines × 1000 readings each)`);
        } catch (error) {
            console.error('❌ Error generating historical data:', error);
        }
    },

    async tick() {
        try {
            const machines = await prisma.machine.findMany({
                where: { status: { not: 'OFFLINE' } },
                select: { id: true, name: true, type: true, status: true },
            });

            if (!machines.length) return;

            const readings: SensorReading[] = machines.map((m) => {
                const profile = MACHINE_PROFILES[m.type] || MACHINE_PROFILES['CNC Machine'];
                return {
                    machineId: m.id,
                    machineName: m.name,
                    machineType: m.type,
                    temperature: noise(profile.temp),
                    powerUsage: noise(profile.power),
                    vibration: noise(profile.vibration),
                    machineStatus: m.status,
                    timestamp: new Date().toISOString(),
                };
            });

            // Broadcast live sensor data to all WebSocket clients
            if (broadcastFn) {
                broadcastFn({ type: 'sensor_update', data: readings });
            }

            // Persist to DB for historical analysis
            await prisma.energyReading.createMany({
                data: readings.map((r) => ({
                    machineId: r.machineId,
                    voltage: 380,
                    current: parseFloat((r.powerUsage / 0.38).toFixed(2)),
                    power: r.powerUsage,
                    temperature: r.temperature,
                    vibration: r.vibration,
                    production: 0,
                    runtime: 1,
                })),
                skipDuplicates: true,
            });

            console.log(`📡 [Sensor] Broadcast ${readings.length} machine readings`);
        } catch (err) {
            console.error('[Sensor] Tick error:', err);
        }
    },

    start() {
        if (sensorInterval) return;
        console.log('📡 [Sensor] Service started — polling every 2s');
        sensorInterval = setInterval(() => this.tick(), 2000);
        // Note: generateHistoricalData should be called from server.ts on startup
    },

    stop() {
        if (sensorInterval) {
            clearInterval(sensorInterval);
            sensorInterval = null;
        }
    },
};
