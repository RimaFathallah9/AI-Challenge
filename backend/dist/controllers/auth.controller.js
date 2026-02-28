"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("../services/auth.service");
exports.authController = {
    async register(req, res) {
        try {
            const { email, password, name, role, factoryId } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            const result = await auth_service_1.authService.register({ email, password, name, role: role, factoryId });
            return res.status(201).json(result);
        }
        catch (err) {
            return res.status(400).json({ error: err.message });
        }
    },
    async login(req, res) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: 'Email and password are required' });
            }
            const result = await auth_service_1.authService.login({ email, password });
            return res.status(200).json(result);
        }
        catch (err) {
            return res.status(401).json({ error: err.message });
        }
    },
    async refresh(req, res) {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken)
                return res.status(400).json({ error: 'Refresh token required' });
            const tokens = await auth_service_1.authService.refreshToken(refreshToken);
            return res.status(200).json(tokens);
        }
        catch {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
    },
    async me(req, res) {
        try {
            const userId = req.user?.userId;
            const profile = await auth_service_1.authService.getProfile(userId);
            if (!profile)
                return res.status(404).json({ error: 'User not found' });
            return res.status(200).json(profile);
        }
        catch (err) {
            return res.status(500).json({ error: err.message });
        }
    },
};
//# sourceMappingURL=auth.controller.js.map