"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
exports.broadcast = broadcast;
const ws_1 = require("ws");
const iotSimulator_service_1 = require("../services/iotSimulator.service");
let wss;
const clients = new Set();
function setupWebSocket(server) {
    wss = new ws_1.WebSocketServer({ server, path: '/ws' });
    wss.on('connection', (ws) => {
        const client = { ws, isAlive: true };
        clients.add(client);
        console.log(`🔌 WS client connected. Total: ${clients.size}`);
        ws.on('pong', () => { client.isAlive = true; });
        ws.on('close', () => {
            clients.delete(client);
            console.log(`🔌 WS client disconnected. Total: ${clients.size}`);
        });
        ws.on('error', (err) => console.error('WS error:', err));
        // Send welcome message
        ws.send(JSON.stringify({ type: 'connected', message: 'NEXOVA real-time stream connected' }));
    });
    // Heartbeat ping every 30s
    const heartbeat = setInterval(() => {
        clients.forEach((client) => {
            if (!client.isAlive) {
                clients.delete(client);
                client.ws.terminate();
                return;
            }
            client.isAlive = false;
            client.ws.ping();
        });
    }, 30000);
    wss.on('close', () => clearInterval(heartbeat));
    // Start IoT simulation
    (0, iotSimulator_service_1.startIoTSimulation)(broadcast);
    console.log('✅ WebSocket server initialized');
}
/**
 * Broadcast message to all connected clients
 */
function broadcast(payload) {
    const data = JSON.stringify(payload);
    clients.forEach((client) => {
        if (client.ws.readyState === ws_1.WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}
//# sourceMappingURL=wsServer.js.map