import { ChatController } from '../controllers/chat.controller';
import { Request, Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import { Chat } from '../entities/chat.entity';
import { User } from '../entities/user.entity';
import { Message } from '../entities/message.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';

jest.mock('../db/db_connect', () => ({
    AppDataSource: {
        getRepository: jest.fn()
    }
}));

describe('ChatController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockChatRepository: Partial<Repository<Chat>> & { createQueryBuilder: jest.Mock };
    let mockUserRepository: Partial<Repository<User>>;
    let mockMessageRepository: Partial<Repository<Message>>;
    let mockQueryBuilder: Partial<SelectQueryBuilder<Chat>>;

    beforeEach(() => {
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockQueryBuilder = {
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            getMany: jest.fn()
        };

        mockChatRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder)
        };

        mockUserRepository = {
            findByIds: jest.fn(),
            findOne: jest.fn()
        };

        mockMessageRepository = {
            create: jest.fn(),
            save: jest.fn()
        };

        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity === Chat) return mockChatRepository;
            if (entity === User) return mockUserRepository;
            if (entity === Message) return mockMessageRepository;
            return {};
        });
    });

    describe('getAllChats', () => {
        it('должен вернуть список всех чатов', async () => {
            const mockChats = [
                { id: 1, type: 'direct', participants: [] },
                { id: 2, type: 'group', participants: [] }
            ];

            (mockChatRepository.find as jest.Mock).mockResolvedValue(mockChats);

            await ChatController.getAllChats(mockRequest as Request, mockResponse as Response);

            expect(mockChatRepository.find).toHaveBeenCalledWith({
                relations: ['participants']
            });
            expect(mockResponse.json).toHaveBeenCalledWith(mockChats);
        });
    });

    describe('createChat', () => {
        beforeEach(() => {
            mockRequest = {
                body: {
                    type: 'direct',
                    participantIds: [1, 2]
                }
            };
        });

        it('должен создать новый чат', async () => {
            const mockParticipants = [
                { id: 1, email: 'user1@example.com' },
                { id: 2, email: 'user2@example.com' }
            ];

            const mockChat = {
                id: 1,
                type: 'direct',
                participants: mockParticipants
            };

            (mockUserRepository.findByIds as jest.Mock).mockResolvedValue(mockParticipants);
            (mockChatRepository.create as jest.Mock).mockReturnValue(mockChat);
            (mockChatRepository.save as jest.Mock).mockResolvedValue(mockChat);
            (mockChatRepository.findOne as jest.Mock).mockResolvedValue(mockChat);

            await ChatController.createChat(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockChat);
        });

        it('должен вернуть ошибку если участники не найдены', async () => {
            (mockUserRepository.findByIds as jest.Mock).mockResolvedValue([{ id: 1 }]);

            await ChatController.createChat(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Некоторые пользователи не найдены'
            });
        });
    });

    describe('getChatById', () => {
        beforeEach(() => {
            mockRequest = {
                params: {
                    id: '1'
                }
            };
        });

        it('должен вернуть чат по ID', async () => {
            const mockChat = {
                id: 1,
                type: 'direct',
                participants: [],
                messages: []
            };

            (mockChatRepository.findOne as jest.Mock).mockResolvedValue(mockChat);

            await ChatController.getChatById(mockRequest as Request, mockResponse as Response);

            expect(mockChatRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: ['participants', 'messages', 'messages.sender']
            });
            expect(mockResponse.json).toHaveBeenCalledWith(mockChat);
        });

        it('должен вернуть 404 если чат не найден', async () => {
            (mockChatRepository.findOne as jest.Mock).mockResolvedValue(null);

            await ChatController.getChatById(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Чат не найден'
            });
        });
    });

    describe('getUserChats', () => {
        beforeEach(() => {
            mockRequest = {
                params: {
                    userId: '1'
                }
            };
        });

        it('должен вернуть чаты пользователя', async () => {
            const mockChats = [
                { id: 1, type: 'direct', participants: [], messages: [] },
                { id: 2, type: 'group', participants: [], messages: [] }
            ];

            (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(mockChats);

            await ChatController.getUserChats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith(mockChats);
        });
    });

    describe('sendMessage', () => {
        beforeEach(() => {
            mockRequest = {
                params: {
                    chatId: '1'
                },
                body: {
                    senderId: '1',
                    content: 'Test message'
                }
            };
        });

        it('должен отправить сообщение в чат', async () => {
            const mockChat = {
                id: 1,
                participants: [{ id: 1 }]
            };

            const mockSender = { id: 1 };

            const mockMessage = {
                content: 'Test message',
                sender: mockSender,
                chat: mockChat
            };

            (mockChatRepository.findOne as jest.Mock).mockResolvedValue(mockChat);
            (mockUserRepository.findOne as jest.Mock).mockResolvedValue(mockSender);
            (mockMessageRepository.create as jest.Mock).mockReturnValue(mockMessage);
            (mockMessageRepository.save as jest.Mock).mockResolvedValue(mockMessage);

            await ChatController.sendMessage(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockMessage);
        });

        it('должен вернуть 404 если чат не найден', async () => {
            (mockChatRepository.findOne as jest.Mock).mockResolvedValue(null);

            await ChatController.sendMessage(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Чат не найден'
            });
        });
    });

    describe('deleteChat', () => {
        beforeEach(() => {
            mockRequest = {
                params: {
                    id: '1'
                }
            };
        });

        it('должен удалить чат', async () => {
            (mockChatRepository.delete as jest.Mock).mockResolvedValue({ affected: 1 });

            await ChatController.deleteChat(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Чат успешно удален'
            });
        });

        it('должен вернуть 404 если чат не найден', async () => {
            (mockChatRepository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

            await ChatController.deleteChat(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Чат не найден'
            });
        });
    });
}); 