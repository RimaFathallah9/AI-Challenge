"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rlController = void 0;
const rl_optimizer_service_1 = require("../services/rl-optimizer.service");
exports.rlController = {
    async analyze(req, res) {
        try {
            const analysis = await rl_optimizer_service_1.rlOptimizerService.analyzeAndOptimize();
            res.json(analysis);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async getRecommendations(req, res) {
        try {
            const result = await rl_optimizer_service_1.rlOptimizerService.getOptimizationRecommendations();
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    async generateTrainingData(req, res) {
        try {
            await rl_optimizer_service_1.rlOptimizerService.generateRLTrainingData();
            res.json({ success: true, message: 'RL training data generated successfully' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
};
//# sourceMappingURL=rl.controller.js.map