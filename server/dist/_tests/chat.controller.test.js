"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chat_controller_1 = require("../controllers/chat.controller");
const db_connect_1 = require("../db/db_connect");
const chat_entity_1 = require("../entities/chat.entity");
const user_entity_1 = require("../entities/user.entity");
const message_entity_1 = require("../entities/message.entity");
jest.mock('../db/db_connect', () => ({
    AppDataSource: {
        getRepository: jest.fn()
    }
}));
describe('ChatController', () => {
    let mockRequest;
    let mockResponse;
    let mockChatRepository;
    let mockUserRepository;
    let mockMessageRepository;
    let mockQueryBuilder;
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
        db_connect_1.AppDataSource.getRepository.mockImplementation((entity) => {
            if (entity === chat_entity_1.Chat)
                return mockChatRepository;
            if (entity === user_entity_1.User)
                return mockUserRepository;
            if (entity === message_entity_1.Message)
                return mockMessageRepository;
            return {};
        });
    });
    describe('getAllChats', () => {
        it('должен вернуть список всех чатов', async () => {
            const mockChats = [
                { id: 1, type: 'direct', participants: [] },
                { id: 2, type: 'group', participants: [] }
            ];
            mockChatRepository.find.mockResolvedValue(mockChats);
            await chat_controller_1.ChatController.getAllChats(mockRequest, mockResponse);
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
            mockUserRepository.findByIds.mockResolvedValue(mockParticipants);
            mockChatRepository.create.mockReturnValue(mockChat);
            mockChatRepository.save.mockResolvedValue(mockChat);
            mockChatRepository.findOne.mockResolvedValue(mockChat);
            await chat_controller_1.ChatController.createChat(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockChat);
        });
        it('должен вернуть ошибку если участники не найдены', async () => {
            mockUserRepository.findByIds.mockResolvedValue([{ id: 1 }]);
            await chat_controller_1.ChatController.createChat(mockRequest, mockResponse);
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
            mockChatRepository.findOne.mockResolvedValue(mockChat);
            await chat_controller_1.ChatController.getChatById(mockRequest, mockResponse);
            expect(mockChatRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: ['participants', 'messages', 'messages.sender']
            });
            expect(mockResponse.json).toHaveBeenCalledWith(mockChat);
        });
        it('должен вернуть 404 если чат не найден', async () => {
            mockChatRepository.findOne.mockResolvedValue(null);
            await chat_controller_1.ChatController.getChatById(mockRequest, mockResponse);
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
            mockQueryBuilder.getMany.mockResolvedValue(mockChats);
            await chat_controller_1.ChatController.getUserChats(mockRequest, mockResponse);
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
            mockChatRepository.findOne.mockResolvedValue(mockChat);
            mockUserRepository.findOne.mockResolvedValue(mockSender);
            mockMessageRepository.create.mockReturnValue(mockMessage);
            mockMessageRepository.save.mockResolvedValue(mockMessage);
            await chat_controller_1.ChatController.sendMessage(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockMessage);
        });
        it('должен вернуть 404 если чат не найден', async () => {
            mockChatRepository.findOne.mockResolvedValue(null);
            await chat_controller_1.ChatController.sendMessage(mockRequest, mockResponse);
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
            mockChatRepository.delete.mockResolvedValue({ affected: 1 });
            await chat_controller_1.ChatController.deleteChat(mockRequest, mockResponse);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Чат успешно удален'
            });
        });
        it('должен вернуть 404 если чат не найден', async () => {
            mockChatRepository.delete.mockResolvedValue({ affected: 0 });
            await chat_controller_1.ChatController.deleteChat(mockRequest, mockResponse);
            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Чат не найден'
            });
        });
    });
});
