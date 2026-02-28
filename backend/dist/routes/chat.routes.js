"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chat_controller_1 = require("../controllers/chat.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
// POST /api/ai/chat
router.post('/chat', auth_middleware_1.authenticate, chat_controller_1.chatController.interact);
exports.default = router;
//# sourceMappingURL=chat.routes.js.map