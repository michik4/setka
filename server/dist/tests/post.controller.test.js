"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const typeorm_1 = require("typeorm");
const post_controller_1 = require("../controllers/post.controller");
const entities_mock_1 = require("./mocks/entities.mock");
globals_1.jest.mock('typeorm', () => ({
    getRepository: globals_1.jest.fn(),
    PrimaryGeneratedColumn: globals_1.jest.fn(),
    Column: globals_1.jest.fn(),
    Entity: globals_1.jest.fn(),
    CreateDateColumn: globals_1.jest.fn(),
    UpdateDateColumn: globals_1.jest.fn(),
    ManyToOne: globals_1.jest.fn(),
    OneToMany: globals_1.jest.fn(),
    JoinColumn: globals_1.jest.fn(),
    ManyToMany: globals_1.jest.fn(),
    JoinTable: globals_1.jest.fn()
}));
(0, globals_1.describe)('PostController', () => {
    let postController;
    let mockPostRepository;
    let mockRequest;
    let mockResponse;
    let mockUser;
    let mockPhoto;
    let mockPost;
    (0, globals_1.beforeEach)(() => {
        mockUser = (0, entities_mock_1.createMockUser)();
        mockPhoto = (0, entities_mock_1.createMockPhoto)();
        mockPost = (0, entities_mock_1.createMockPost)(mockUser, [mockPhoto]);
        mockPostRepository = {
            find: globals_1.jest.fn(),
            findOne: globals_1.jest.fn(),
            create: globals_1.jest.fn(),
            save: globals_1.jest.fn(),
            update: globals_1.jest.fn(),
            delete: globals_1.jest.fn()
        };
        typeorm_1.getRepository.mockReturnValue(mockPostRepository);
        mockRequest = {};
        mockResponse = {
            json: globals_1.jest.fn().mockReturnThis(),
            status: globals_1.jest.fn().mockReturnThis(),
            send: globals_1.jest.fn().mockReturnThis()
        };
        postController = new post_controller_1.PostController();
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('getAllPosts', () => {
        (0, globals_1.it)('должен возвращать все посты', async () => {
            const mockPosts = [mockPost];
            mockPostRepository.find.mockResolvedValue(mockPosts);
            await postController.getAllPosts(mockRequest, mockResponse);
            (0, globals_1.expect)(mockPostRepository.find).toHaveBeenCalledWith({
                relations: ['author', 'photos'],
                order: { createdAt: 'DESC' }
            });
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith(mockPosts);
        });
        (0, globals_1.it)('должен обрабатывать ошибки при получении постов', async () => {
            const error = new Error('Ошибка базы данных');
            mockPostRepository.find.mockRejectedValue(error);
            await postController.getAllPosts(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(500);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({
                message: 'Ошибка при получении постов',
                error
            });
        });
    });
    (0, globals_1.describe)('getPostById', () => {
        (0, globals_1.it)('должен возвращать пост по ID', async () => {
            mockRequest.params = { id: '1' };
            mockPostRepository.findOne.mockResolvedValue(mockPost);
            await postController.getPostById(mockRequest, mockResponse);
            (0, globals_1.expect)(mockPostRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: ['author', 'photos']
            });
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith(mockPost);
        });
        (0, globals_1.it)('должен возвращать 404 если пост не найден', async () => {
            mockRequest.params = { id: '999' };
            mockPostRepository.findOne.mockResolvedValue(null);
            await postController.getPostById(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(404);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ message: 'Пост не найден' });
        });
    });
    (0, globals_1.describe)('createPost', () => {
        (0, globals_1.it)('должен создавать новый пост', async () => {
            mockRequest.body = {
                content: 'Новый пост',
                authorId: 1,
                photoIds: [1]
            };
            mockPostRepository.create.mockReturnValue(mockPost);
            mockPostRepository.save.mockResolvedValue(mockPost);
            mockPostRepository.findOne.mockResolvedValue(mockPost);
            await postController.createPost(mockRequest, mockResponse);
            (0, globals_1.expect)(mockPostRepository.create).toHaveBeenCalledWith({
                content: 'Новый пост',
                authorId: 1,
                photos: [{ id: 1 }]
            });
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(201);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith(mockPost);
        });
        (0, globals_1.it)('должен обрабатывать ошибки при создании поста', async () => {
            mockRequest.body = { content: 'Новый пост' };
            mockPostRepository.create.mockImplementation(() => {
                throw new Error('Ошибка создания');
            });
            await postController.createPost(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(500);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({
                message: 'Ошибка при создании поста',
                error: globals_1.expect.any(Error)
            });
        });
    });
    (0, globals_1.describe)('updatePost', () => {
        (0, globals_1.it)('должен обновлять существующий пост', async () => {
            mockRequest.params = { id: '1' };
            mockRequest.body = {
                content: 'Обновленный пост',
                photoIds: [2]
            };
            mockPostRepository.findOne
                .mockResolvedValueOnce(mockPost)
                .mockResolvedValueOnce({ ...mockPost, content: 'Обновленный пост' });
            await postController.updatePost(mockRequest, mockResponse);
            (0, globals_1.expect)(mockPostRepository.update).toHaveBeenCalledWith('1', {
                content: 'Обновленный пост',
                photos: [{ id: 2 }]
            });
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalled();
        });
        (0, globals_1.it)('должен возвращать 404 при обновлении несуществующего поста', async () => {
            mockRequest.params = { id: '999' };
            mockRequest.body = { content: 'Обновленный пост' };
            mockPostRepository.findOne.mockResolvedValue(null);
            await postController.updatePost(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(404);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ message: 'Пост не найден' });
        });
    });
    (0, globals_1.describe)('deletePost', () => {
        (0, globals_1.it)('должен удалять существующий пост', async () => {
            mockRequest.params = { id: '1' };
            mockPostRepository.findOne.mockResolvedValue(mockPost);
            await postController.deletePost(mockRequest, mockResponse);
            (0, globals_1.expect)(mockPostRepository.delete).toHaveBeenCalledWith('1');
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(204);
            (0, globals_1.expect)(mockResponse.send).toHaveBeenCalled();
        });
        (0, globals_1.it)('должен возвращать 404 при удалении несуществующего поста', async () => {
            mockRequest.params = { id: '999' };
            mockPostRepository.findOne.mockResolvedValue(null);
            await postController.deletePost(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(404);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({ message: 'Пост не найден' });
        });
    });
    (0, globals_1.describe)('getUserPosts', () => {
        (0, globals_1.it)('должен возвращать посты пользователя', async () => {
            mockRequest.params = { userId: '1' };
            const userPosts = [mockPost];
            mockPostRepository.find.mockResolvedValue(userPosts);
            await postController.getUserPosts(mockRequest, mockResponse);
            (0, globals_1.expect)(mockPostRepository.find).toHaveBeenCalledWith({
                where: { authorId: 1 },
                relations: ['author', 'photos'],
                order: { createdAt: 'DESC' }
            });
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith(userPosts);
        });
        (0, globals_1.it)('должен обрабатывать ошибки при получении постов пользователя', async () => {
            mockRequest.params = { userId: '1' };
            const error = new Error('Ошибка базы данных');
            mockPostRepository.find.mockRejectedValue(error);
            await postController.getUserPosts(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(500);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({
                message: 'Ошибка при получении постов пользователя',
                error
            });
        });
    });
});
