"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const friend_controller_1 = require("../controllers/friend.controller");
const router = express_1.default.Router();
// Middleware для приведения типов
const handleRequest = (handler) => {
    return async (req, res, next) => {
        try {
            await handler(req, res);
        }
        catch (error) {
            next(error);
        }
    };
};
// Получить входящие запросы в друзья - более специфичный маршрут должен идти перед маршрутами с параметрами
router.get('/requests', auth_middleware_1.authenticateSession, handleRequest(friend_controller_1.FriendController.getIncomingFriendRequests));
// Маршруты для запросов дружбы - более специфичные
router.post('/request/:userId', auth_middleware_1.authenticateSession, handleRequest(friend_controller_1.FriendController.sendFriendRequest));
router.post('/accept/:userId', auth_middleware_1.authenticateSession, handleRequest(friend_controller_1.FriendController.acceptFriendRequest));
router.post('/reject/:userId', auth_middleware_1.authenticateSession, handleRequest(friend_controller_1.FriendController.rejectFriendRequest));
// Получить статус дружбы - специфичный маршрут
router.get('/status/:userId', auth_middleware_1.authenticateSession, handleRequest(friend_controller_1.FriendController.getFriendshipStatus));
// Общие маршруты с параметрами
router.get('/:userId', auth_middleware_1.authenticateSession, handleRequest(friend_controller_1.FriendController.getFriends));
router.delete('/:userId', auth_middleware_1.authenticateSession, handleRequest(friend_controller_1.FriendController.removeFriend));
exports.default = router;
