import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout: 10000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('nexova_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Handle 401 — clear auth and redirect to login
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('nexova_token');
            localStorage.removeItem('nexova_user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (data: { email: string; password: string; name?: string; role?: string }) =>
        api.post('/auth/register', data),
    me: () => api.get('/auth/me'),
};

// ── Machines ────────────────────────────────────────────────────────────────
export const machineApi = {
    getAll: (factoryId?: string) => api.get('/machines', { params: { factoryId } }),
    getById: (id: string) => api.get(`/machines/${id}`),
    getAnalytics: (id: string) => api.get(`/machines/${id}/analytics`),
    create: (data: object) => api.post('/machines', data),
    update: (id: string, data: object) => api.put(`/machines/${id}`, data),
    delete: (id: string) => api.delete(`/machines/${id}`),
    approve: (id: string, action: 'APPROVED' | 'REJECTED') =>
        api.patch(`/machines/${id}/approve`, { action }),
};

// ── Energy ──────────────────────────────────────────────────────────────────
export const energyApi = {
    getDashboardStats: () => api.get('/energy/dashboard'),
    getMonthlyTrend: () => api.get('/energy/trend'),
    getHistory: (machineId: string, hours?: number) =>
        api.get(`/energy/${machineId}`, { params: { hours } }),
};

// ── Alerts ──────────────────────────────────────────────────────────────────
export const alertApi = {
    getAll: (resolved?: boolean) => api.get('/alerts', { params: { resolved } }),
    getById: (id: string) => api.get(`/alerts/${id}`),
    getStats: () => api.get('/alerts/stats'),
    resolve: (id: string) => api.patch(`/alerts/${id}/resolve`),
};

// ── Factories ───────────────────────────────────────────────────────────────
export const factoryApi = {
    getAll: () => api.get('/factories'),
    create: (data: object) => api.post('/factories', data),
    update: (id: string, data: object) => api.put(`/factories/${id}`, data),
    delete: (id: string) => api.delete(`/factories/${id}`),
};

// ── Admin ───────────────────────────────────────────────────────────────────
export const adminApi = {
    getUsers: () => api.get('/admin/users'),
    updateRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
    deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
    getStats: () => api.get('/admin/stats'),
};

// ── AI ───────────────────────────────────────────────────────────────────────
export const aiApi = {
    forecast: (machineId: string, horizon?: number) =>
        api.post('/ai/forecast', { machineId, horizon }),
    detectAnomalies: (machineId: string) =>
        api.post('/ai/anomaly', { machineId }),
    getRecommendations: (machineId: string) =>
        api.post('/ai/recommendations', { machineId }),
    chat: (message: string) => api.post('/ai/chat', { message }),
};

// ── Reinforcement Learning (RL) ──────────────────────────────────────────────
export const rlApi = {
    analyze: () => api.get('/rl/analyze'),
    getRecommendations: () => api.get('/rl/recommendations'),
    generateTrainingData: () => api.post('/rl/admin/generate-training-data'),
};

// ── Digital Twin ────────────────────────────────────────────────────────────
export const digitalTwinApi = {
    getAllMachines: () => api.get('/digital-twin/machines'),
    getMachineState: (machineId: string) => api.get(`/digital-twin/machines/${machineId}`),
    simulateScenario: (machineId: string, scenario: string, duration: number) =>
        api.post(`/digital-twin/machines/${machineId}/simulate`, { scenario, duration }),
    testAllScenarios: (machineId: string) =>
        api.get(`/digital-twin/machines/${machineId}/test-scenarios`),
    getRUL: (machineId: string) => api.get(`/digital-twin/machines/${machineId}/rul`),
    predictFailure: (machineId: string) =>
        api.get(`/digital-twin/machines/${machineId}/predict-failure`),
    getProductionBaseline: (machineId: string) =>
        api.get(`/digital-twin/machines/${machineId}/production-baseline`),
    simulateProduction: (machineId: string, data: {
        operationHours: number;
        targetProduction: number;
        materialType?: string;
        materialQuantity?: number;
    }) =>
        api.post(`/digital-twin/machines/${machineId}/simulate-production`, data),
};

// ── NEXOVA AI AGENT (8 Core Features) ────────────────────────────────────────
export const aiAgentApi = {
    // 1️⃣ Real-Time Industrial Monitoring
    monitorMachine: (machineId: string) =>
        api.get(`/ai-agent/machines/${machineId}/monitor`),
    
    // 2️⃣ Intelligent Anomaly Detection
    detectAnomalies: (machineId: string) =>
        api.get(`/ai-agent/machines/${machineId}/anomalies`),
    
    // 3️⃣ Predictive Maintenance Engine
    predictMaintenance: (machineId: string) =>
        api.get(`/ai-agent/machines/${machineId}/maintenance`),
    
    // 4️⃣ Energy Optimization Intelligence
    optimizeEnergy: (machineId: string) =>
        api.get(`/ai-agent/machines/${machineId}/optimize-energy`),
    
    // 5️⃣ Autonomous Decision-Making System
    makeDecision: (machineId: string) =>
        api.post(`/ai-agent/machines/${machineId}/decide`, {}),
    
    // 6️⃣ Explainable AI (XAI) Layer
    generateReport: (machineId: string) =>
        api.get(`/ai-agent/machines/${machineId}/report`),
    
    // 7️⃣ Continuous Learning System
    recordFeedback: (machineId: string, data: { decision: string; outcome: string; improvement: number }) =>
        api.post(`/ai-agent/machines/${machineId}/feedback`, data),
    getLearningHistory: (machineId: string, limit?: number) =>
        api.get(`/ai-agent/machines/${machineId}/history`, { params: { limit } }),
    
    // 8️⃣ Multi-Source Data Fusion
    fuseData: (machineId: string) =>
        api.get(`/ai-agent/machines/${machineId}/fuse`),
    
    // Comprehensive Dashboard & Status
    getStatus: (factoryId?: string) =>
        api.get(`/ai-agent/status`, { params: { factoryId } }),
    getDashboard: (machineId: string) =>
        api.get(`/ai-agent/dashboard`, { params: { machineId } }),
};
