import { AuthController } from '../controllers/auth.controller';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';
import { Request, Response } from 'express';
import { User } from '../entities/user.entity';
import { Session } from '../entities/session.entity';
import { AuthRequest } from '../middleware/auth.middleware';
import bcrypt from 'bcrypt';

jest.mock('../services/session.service');
jest.mock('../services/user.service');
jest.mock('bcrypt');

describe('AuthController', () => {
    let authController: AuthController;
    let mockUserService: jest.Mocked<UserService>;
    let mockSessionService: jest.Mocked<SessionService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockUserService = new UserService() as jest.Mocked<UserService>;
        mockSessionService = new SessionService() as jest.Mocked<SessionService>;
        authController = new AuthController();

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
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);
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
            } as User;

            const mockSession = {
                sessionId: 'test-session-id',
                userId: mockUser.id,
                deviceInfo: 'test-agent',
                ipAddress: '127.0.0.1',
                lastActivity: new Date(),
                expiresAt: new Date(),
                isActive: true,
                user: mockUser
            } as Session;

            mockUserService.getUserByEmail.mockResolvedValue(mockUser);
            mockSessionService.createSession.mockResolvedValue(mockSession);

            await authController.login(mockRequest as Request, mockResponse as Response);

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

            await authController.login(mockRequest as Request, mockResponse as Response);

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

            await authController.logout(mockRequest as Request, mockResponse as Response);

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
            } as AuthRequest;
            mockRequest = mockAuthRequest;
        });

        it('должен разлогинить пользователя со всех устройств', async () => {
            mockSessionService.deactivateAllUserSessions.mockResolvedValue(undefined);

            await authController.logoutAll(mockRequest as AuthRequest, mockResponse as Response);

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
            } as AuthRequest;
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
            } as User;

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
            ] as Session[];

            mockSessionService.getActiveSessionsByUserId.mockResolvedValue(mockSessions);

            await authController.getSessions(mockRequest as AuthRequest, mockResponse as Response);

            expect(mockSessionService.getActiveSessionsByUserId).toHaveBeenCalledWith(1);
            expect(mockResponse.json).toHaveBeenCalledWith(mockSessions);
        });
    });
}); 