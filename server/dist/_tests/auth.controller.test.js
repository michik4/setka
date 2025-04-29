"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const auth_controller_1 = require("../controllers/auth.controller");
const session_service_1 = require("../services/session.service");
const user_service_1 = require("../services/user.service");
const bcrypt_1 = __importDefault(require("bcrypt"));
jest.mock('../services/session.service');
jest.mock('../services/user.service');
jest.mock('bcrypt');
describe('AuthController', () => {
    let authController;
    let mockUserService;
    let mockSessionService;
    let mockRequest;
    let mockResponse;
    beforeEach(() => {
        mockUserService = new user_service_1.UserService();
        mockSessionService = new session_service_1.SessionService();
        authController = new auth_controller_1.AuthController();
        // Переопределяем сервисы в контроллере
        Object.defineProperty(authController, 'userService', {
            get: () => mockUserService
        });
        Object.defineProperty(authController, 'sessionService', {
            get: () => mockSessionService
        });
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            cookie: jest.fn(),
            clearCookie: jest.fn()
        };
        // Мокаем bcrypt
        bcrypt_1.default.compare.mockResolvedValue(true);
    });
    describe('login', () => {
        beforeEach(() => {
            mockRequest = {
                body: {
                    email: 'test@example.com',
                    password: 'password123'
                },
                ip: '127.0.0.1',
                headers: {
                    'user-agent': 'test-agent'
                }
            };
        });
        it('должен успешно авторизовать пользователя', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const mockSession = {
                sessionId: 'test-session-id',
                userId: mockUser.id,
                deviceInfo: 'test-agent',
                ipAddress: '127.0.0.1',
                lastActivity: new Date(),
                expiresAt: new Date(),
                isActive: true,
                user: mockUser
            };
            mockUserService.getUserByEmail.mockResolvedValue(mockUser);
            mockSessionService.createSession.mockResolvedValue(mockSession);
            await authController.login(mockRequest, mockResponse);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Успешная авторизация',
                user: {
                    id: mockUser.id,
                    email: mockUser.email,
                    firstName: mockUser.firstName
                }
            });
        });
        it('должен вернуть ошибку при неверных учетных данных', async () => {
            mockUserService.getUserByEmail.mockResolvedValue(null);
            await authController.login(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Неверный email или пароль'
            });
        });
    });
    describe('logout', () => {
        beforeEach(() => {
            mockRequest = {
                cookies: {
                    'session_id': 'test-session-id'
                }
            };
        });
        it('должен успешно разлогинить пользователя', async () => {
            mockSessionService.deactivateSession.mockResolvedValue(undefined);
            await authController.logout(mockRequest, mockResponse);
            expect(mockSessionService.deactivateSession).toHaveBeenCalledWith('test-session-id');
            expect(mockResponse.clearCookie).toHaveBeenCalledWith('session_id');
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Успешный выход'
            });
        });
    });
    describe('logoutAll', () => {
        beforeEach(() => {
            const mockAuthRequest = {
                ...mockRequest,
                user: { id: 1, email: 'test@example.com' }
            };
            mockRequest = mockAuthRequest;
        });
        it('должен разлогинить пользователя со всех устройств', async () => {
            mockSessionService.deactivateAllUserSessions.mockResolvedValue(undefined);
            await authController.logoutAll(mockRequest, mockResponse);
            expect(mockSessionService.deactivateAllUserSessions).toHaveBeenCalledWith(1);
            expect(mockResponse.clearCookie).toHaveBeenCalledWith('session_id');
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Успешный выход со всех устройств'
            });
        });
    });
    describe('getSessions', () => {
        beforeEach(() => {
            const mockAuthRequest = {
                ...mockRequest,
                user: { id: 1, email: 'test@example.com' }
            };
            mockRequest = mockAuthRequest;
        });
        it('должен вернуть список активных сессий пользователя', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                password: 'hashedPassword',
                firstName: 'Test',
                lastName: 'User',
                createdAt: new Date(),
                updatedAt: new Date()
            };
            const mockSessions = [
                {
                    sessionId: 'session1',
                    userId: 1,
                    deviceInfo: 'device1',
                    ipAddress: '127.0.0.1',
                    lastActivity: new Date(),
                    expiresAt: new Date(),
                    isActive: true,
                    user: mockUser
                },
                {
                    sessionId: 'session2',
                    userId: 1,
                    deviceInfo: 'device2',
                    ipAddress: '127.0.0.1',
                    lastActivity: new Date(),
                    expiresAt: new Date(),
                    isActive: true,
                    user: mockUser
                }
            ];
            mockSessionService.getActiveSessionsByUserId.mockResolvedValue(mockSessions);
            await authController.getSessions(mockRequest, mockResponse);
            expect(mockSessionService.getActiveSessionsByUserId).toHaveBeenCalledWith(1);
            expect(mockResponse.json).toHaveBeenCalledWith(mockSessions);
        });
    });
});
