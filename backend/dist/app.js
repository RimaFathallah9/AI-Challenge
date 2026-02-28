"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const env_1 = require("./config/env");
// Route imports
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const machine_routes_1 = __importDefault(require("./routes/machine.routes"));
const energy_routes_1 = __importDefault(require("./routes/energy.routes"));
const alert_routes_1 = __importDefault(require("./routes/alert.routes"));
const factory_routes_1 = __importDefault(require("./routes/factory.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const ai_routes_1 = __importDefault(require("./routes/ai.routes"));
const ai_agent_routes_1 = __importDefault(require("./routes/ai-agent.routes"));
const rl_routes_1 = __importDefault(require("./routes/rl.routes"));
const digital_twin_routes_1 = __importDefault(require("./routes/digital-twin.routes"));
const app = (0, express_1.default)();
// ── Middleware ─────────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: env_1.config.frontendUrl,
    credentials: true,
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
// ── Request logger (dev only) ──────────────────────────────────────────────
if (env_1.config.nodeEnv === 'development') {
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
app.use('/api/auth', auth_routes_1.default);
app.use('/api/machines', machine_routes_1.default);
app.use('/api/energy', energy_routes_1.default);
app.use('/api/alerts', alert_routes_1.default);
app.use('/api/factories', factory_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/ai', ai_routes_1.default);
app.use('/api/ai-agent', ai_agent_routes_1.default);
app.use('/api/rl', rl_routes_1.default);
app.use('/api/digital-twin', digital_twin_routes_1.default);
// ── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});
// ── Global error handler ───────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error('[ERROR]', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});
exports.default = app;
//# sourceMappingURL=app.js.map