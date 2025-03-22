import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/user.service';
import { Request, Response } from 'express';
import { User } from '../entities/user.entity';

jest.mock('../services/user.service');

describe('UserController', () => {
    let userController: UserController;
    let mockUserService: jest.Mocked<UserService>;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockUserService = new UserService() as jest.Mocked<UserService>;
        userController = new UserController();

        // Переопределяем методы UserService для тестов
        Object.defineProperty(userController, 'userService', {
            get: () => mockUserService
        });

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            send: jest.fn()
        };
    });

    describe('createUser', () => {
        beforeEach(() => {
            mockRequest = {
                body: {
                    email: 'test@example.com',
                    password: 'password123',
                    firstName: 'Test',
                    lastName: 'User'
                }
            };
        });

        it('должен успешно создать пользователя', async () => {
            const mockUser = {
                id: 1,
                ...mockRequest.body,
                createdAt: new Date(),
                updatedAt: new Date()
            } as User;

            mockUserService.createUser.mockResolvedValue(mockUser);

            await userController.createUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
        });

        it('должен вернуть ошибку при неверных данных', async () => {
            const error = new Error('Validation error');
            mockUserService.createUser.mockRejectedValue(error);

            await userController.createUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Ошибка при создании пользователя',
                error
            });
        });
    });

    describe('getUsers', () => {
        it('должен вернуть список всех пользователей', async () => {
            const mockUsers = [
                {
                    id: 1,
                    email: 'user1@example.com',
                    firstName: 'User1',
                    lastName: 'Test1',
                    password: 'hashedPassword1',
                    createdAt: new Date(),
                    updatedAt: new Date()
                },
                {
                    id: 2,
                    email: 'user2@example.com',
                    firstName: 'User2',
                    lastName: 'Test2',
                    password: 'hashedPassword2',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ] as User[];

            mockUserService.getAllUsers.mockResolvedValue(mockUsers);

            await userController.getUsers(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(mockUsers);
        });
    });

    describe('getUserByEmail', () => {
        beforeEach(() => {
            mockRequest = {
                params: {
                    email: 'test@example.com'
                }
            };
        });

        it('должен найти пользователя по email', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                firstName: 'Test',
                lastName: 'User',
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date()
            } as User;

            mockUserService.getUserByEmail.mockResolvedValue(mockUser);

            await userController.getUserByEmail(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
        });

        it('должен вернуть 404 если пользователь не найден', async () => {
            mockUserService.getUserByEmail.mockResolvedValue(null);

            await userController.getUserByEmail(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Пользователь не найден'
            });
        });
    });

    describe('updateUser', () => {
        beforeEach(() => {
            mockRequest = {
                params: {
                    id: '1'
                },
                body: {
                    firstName: 'Updated',
                    lastName: 'User'
                }
            };
        });

        it('должен обновить пользователя', async () => {
            const mockUser = {
                id: 1,
                email: 'test@example.com',
                firstName: 'Updated',
                lastName: 'User',
                password: 'hashedPassword',
                createdAt: new Date(),
                updatedAt: new Date()
            } as User;

            mockUserService.updateUser.mockResolvedValue(mockUser);

            await userController.updateUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(mockUser);
        });

        it('должен вернуть 404 если пользователь не найден', async () => {
            mockUserService.updateUser.mockResolvedValue(null);

            await userController.updateUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Пользователь не найден'
            });
        });
    });

    describe('deleteUser', () => {
        beforeEach(() => {
            mockRequest = {
                params: {
                    id: '1'
                }
            };
        });

        it('должен удалить пользователя', async () => {
            await userController.deleteUser(mockRequest as Request, mockResponse as Response);

            expect(mockUserService.deleteUser).toHaveBeenCalledWith(1);
            expect(mockResponse.status).toHaveBeenCalledWith(204);
            expect(mockResponse.send).toHaveBeenCalled();
        });
    });

    describe('createRandomUser', () => {
        it('должен создать случайного пользователя', async () => {
            const mockRandomUser = {
                id: 1,
                email: 'random@example.com',
                password: 'random123',
                firstName: 'Random',
                lastName: 'User',
                createdAt: new Date(),
                updatedAt: new Date()
            } as User;

            mockUserService.createRandomUser.mockResolvedValue(mockRandomUser);
            mockUserService.createUser.mockResolvedValue(mockRandomUser);

            await userController.createRandomUser(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockRandomUser);
        });
    });
}); 