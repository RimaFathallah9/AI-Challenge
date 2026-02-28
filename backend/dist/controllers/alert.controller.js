"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alertController = void 0;
const alert_service_1 = require("../services/alert.service");
exports.alertController = {
    async getAll(req, res) {
        try {
            const resolved = req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined;
            const alerts = await alert_service_1.alertService.getAll(resolved);
            res.json(alerts);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getById(req, res) {
        try {
            const alert = await alert_service_1.alertService.getById(req.params.id);
            if (!alert)
                return res.status(404).json({ error: 'Alert not found' });
            res.json(alert);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async create(req, res) {
        try {
            const alert = await alert_service_1.alertService.create(req.body);
            res.status(201).json(alert);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async resolve(req, res) {
        try {
            const alert = await alert_service_1.alertService.resolve(req.params.id);
            res.json(alert);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getStats(req, res) {
        try {
            const stats = await alert_service_1.alertService.getStats();
            res.json(stats);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
//# sourceMappingURL=alert.controller.js.map