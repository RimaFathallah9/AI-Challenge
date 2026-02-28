"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const machine_controller_1 = require("../controllers/machine.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const role_middleware_1 = require("../middleware/role.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', machine_controller_1.machineController.getAll);
router.get('/:id', machine_controller_1.machineController.getById);
router.get('/:id/analytics', machine_controller_1.machineController.getAnalytics);
// ALL authenticated roles can create — but Technicians land as PENDING
router.post('/', machine_controller_1.machineController.create);
// Only Admin/Manager can edit or delete
router.put('/:id', (0, role_middleware_1.requireRole)('ADMIN', 'MANAGER'), machine_controller_1.machineController.update);
router.delete('/:id', (0, role_middleware_1.requireRole)('ADMIN'), machine_controller_1.machineController.delete);
// Admin-only: approve or reject a pending machine
router.patch('/:id/approve', (0, role_middleware_1.requireRole)('ADMIN'), machine_controller_1.machineController.approve);
exports.default = router;
//# sourceMappingURL=machine.routes.js.map