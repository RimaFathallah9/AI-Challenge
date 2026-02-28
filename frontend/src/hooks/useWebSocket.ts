import { useEffect, useRef } from 'react';
import { useDashboardStore } from '../store/dashboard.store';
import { WsMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4000';

export function useWebSocket() {
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { updateLiveReadings } = useDashboardStore();

    const connect = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(`${WS_URL}/ws`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log('🔌 WebSocket connected');
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
        };

        ws.onmessage = (event) => {
            try {
                const msg: WsMessage = JSON.parse(event.data);

                // Handle old IoT simulator format
                if (msg.type === 'iot_data' && msg.readings) {
                    updateLiveReadings(msg.readings);
                }

                // Handle new sensor service format
                if (msg.type === 'sensor_update' && msg.data) {
                    // Normalize sensor_update fields to IoTReading shape
                    const normalized = msg.data.map((r: any) => ({
                        ...r,
                        status: r.machineStatus || 'ONLINE',
                        power: r.powerUsage ?? r.power ?? 0,
                        voltage: r.voltage ?? 380,
                        current: r.current ?? 0,
                        runtime: r.runtime ?? 0,
                    }));
                    updateLiveReadings(normalized);
                }
            } catch (err) {
                console.warn('WS parse error:', err);
            }
        };

        ws.onclose = () => {
            console.log('🔌 WebSocket disconnected — reconnecting in 3s...');
            reconnectRef.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
            ws.close();
        };
    };

    useEffect(() => {
        connect();
        return () => {
            if (reconnectRef.current) clearTimeout(reconnectRef.current);
            wsRef.current?.close();
        };
    }, []);

    return { ws: wsRef.current };
}
