import express from 'express';
import cors from 'cors';
import { config } from './config/env';

// Route imports
import authRoutes from './routes/auth.routes';
import machineRoutes from './routes/machine.routes';
import energyRoutes from './routes/energy.routes';
import alertRoutes from './routes/alert.routes';
import factoryRoutes from './routes/factory.routes';
import adminRoutes from './routes/admin.routes';
import aiRoutes from './routes/ai.routes';
import aiAgentRoutes from './routes/ai-agent.routes';
import rlRoutes from './routes/rl.routes';
import digitalTwinRoutes from './routes/digital-twin.routes';

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Request logger (dev only) ──────────────────────────────────────────────
if (config.nodeEnv === 'development') {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

// ── Health check ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nexova-backend', ts: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/factories', factoryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/ai-agent', aiAgentRoutes);
app.use('/api/rl', rlRoutes);
app.use('/api/digital-twin', digitalTwinRoutes);

// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

export default app;
