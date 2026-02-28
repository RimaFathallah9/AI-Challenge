"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const alert_controller_1 = require("../controllers/alert.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', alert_controller_1.alertController.getAll);
router.get('/stats', alert_controller_1.alertController.getStats);
router.get('/:id', alert_controller_1.alertController.getById);
router.post('/', alert_controller_1.alertController.create);
router.patch('/:id/resolve', alert_controller_1.alertController.resolve);
exports.default = router;
//# sourceMappingURL=alert.routes.js.map