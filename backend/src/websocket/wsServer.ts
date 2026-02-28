import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { startIoTSimulation } from '../services/iotSimulator.service';
import { prisma } from '../prisma/client';

interface WsClient {
    ws: WebSocket;
    isAlive: boolean;
}

let wss: WebSocketServer;
const clients = new Set<WsClient>();

export function setupWebSocket(server: Server) {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws) => {
        const client: WsClient = { ws, isAlive: true };
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
    startIoTSimulation(broadcast);

    console.log('✅ WebSocket server initialized');
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(payload: object) {
    const data = JSON.stringify(payload);
    clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(data);
        }
    });
}
