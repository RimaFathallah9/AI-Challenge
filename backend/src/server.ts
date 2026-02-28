import 'dotenv/config';
import { createServer } from 'http';
import app from './app';
import { config } from './config/env';
import { setupWebSocket, broadcast } from './websocket/wsServer';
import { prisma } from './prisma/client';
import { sensorService } from './services/sensor.service';

const httpServer = createServer(app);

// Attach WebSocket server to the same HTTP server
setupWebSocket(httpServer);

async function bootstrap() {
    try {
        // Test DB connection
        await prisma.$connect();
        console.log('✅ Database connected');

        // Check if we have historical data, if not generate 1000+ readings
        const existingReadingsCount = await prisma.energyReading.count();
        if (existingReadingsCount < 100) {
            console.log('📊 Low data detected. Generating historical readings...');
            await sensorService.generateHistoricalData();
        } else {
            console.log(`📊 Found ${existingReadingsCount} existing energy readings in database`);
        }

        httpServer.listen(config.port, () => {
            console.log(`🚀 NEXOVA Backend running at http://localhost:${config.port}`);
            console.log(`🔌 WebSocket available at ws://localhost:${config.port}`);
            console.log(`🌍 Environment: ${config.nodeEnv}`);
        });

        // Wire sensor service to broadcast live readings via WebSocket every 2s
        sensorService.setBroadcast(broadcast);
        sensorService.start();
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await prisma.$disconnect();
    process.exit(0);
});

bootstrap();
