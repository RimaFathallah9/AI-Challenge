"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const wsServer_1 = require("./websocket/wsServer");
const client_1 = require("./prisma/client");
const sensor_service_1 = require("./services/sensor.service");
const httpServer = (0, http_1.createServer)(app_1.default);
// Attach WebSocket server to the same HTTP server
(0, wsServer_1.setupWebSocket)(httpServer);
async function bootstrap() {
    try {
        // Test DB connection
        await client_1.prisma.$connect();
        console.log('✅ Database connected');
        // Check if we have historical data, if not generate 1000+ readings
        const existingReadingsCount = await client_1.prisma.energyReading.count();
        if (existingReadingsCount < 100) {
            console.log('📊 Low data detected. Generating historical readings...');
            await sensor_service_1.sensorService.generateHistoricalData();
        }
        else {
            console.log(`📊 Found ${existingReadingsCount} existing energy readings in database`);
        }
        httpServer.listen(env_1.config.port, () => {
            console.log(`🚀 NEXOVA Backend running at http://localhost:${env_1.config.port}`);
            console.log(`🔌 WebSocket available at ws://localhost:${env_1.config.port}`);
            console.log(`🌍 Environment: ${env_1.config.nodeEnv}`);
        });
        // Wire sensor service to broadcast live readings via WebSocket every 2s
        sensor_service_1.sensorService.setBroadcast(wsServer_1.broadcast);
        sensor_service_1.sensorService.start();
    }
    catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await client_1.prisma.$disconnect();
    process.exit(0);
});
process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await client_1.prisma.$disconnect();
    process.exit(0);
});
bootstrap();
//# sourceMappingURL=server.js.map