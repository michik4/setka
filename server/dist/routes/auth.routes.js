"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
// Публичные маршруты
router.post('/login', authController.login.bind(authController));
router.post('/register', authController.register.bind(authController));
// Защищенные маршруты
router.post('/logout', auth_middleware_1.authenticateSession, authController.logout.bind(authController));
router.post('/logout-all', auth_middleware_1.authenticateSession, authController.logoutAll.bind(authController));
router.get('/sessions', auth_middleware_1.authenticateSession, authController.getSessions.bind(authController));
router.get('/me', auth_middleware_1.authenticateSession, authController.getCurrentUser.bind(authController));
router.post('/cleanup-temp', auth_middleware_1.authenticateSession, authController.cleanupTemp.bind(authController));
exports.default = router;
