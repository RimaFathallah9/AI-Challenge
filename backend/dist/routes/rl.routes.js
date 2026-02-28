"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rl_controller_1 = require("../controllers/rl.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Get energy optimization analysis
router.get('/analyze', rl_controller_1.rlController.analyze);
// Get actionable recommendations for cost savings
router.get('/recommendations', rl_controller_1.rlController.getRecommendations);
// Admin-only: Generate training data for the RL model
router.post('/admin/generate-training-data', (0, role_middleware_1.requireRole)('ADMIN'), rl_controller_1.rlController.generateTrainingData);
exports.default = router;
//# sourceMappingURL=rl.routes.js.map