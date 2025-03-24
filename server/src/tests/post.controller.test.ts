import { describe, it, beforeEach, afterEach, expect, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import { PostController } from '../controllers/post.controller';
import { Post } from '../entities/post.entity';
import { User } from '../entities/user.entity';
import { Photo } from '../entities/photo.entity';
import { createMockUser, createMockPhoto, createMockPost } from './mocks/entities.mock';

jest.mock('typeorm', () => ({
    getRepository: jest.fn(),
    PrimaryGeneratedColumn: jest.fn(),
    Column: jest.fn(),
    Entity: jest.fn(),
    CreateDateColumn: jest.fn(),
    UpdateDateColumn: jest.fn(),
    ManyToOne: jest.fn(),
    OneToMany: jest.fn(),
    JoinColumn: jest.fn(),
    ManyToMany: jest.fn(),
    JoinTable: jest.fn()
}));

describe('PostController', () => {
    let postController: PostController;
    let mockPostRepository: any;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockUser: Partial<User>;
    let mockPhoto: Partial<Photo>;
    let mockPost: Partial<Post>;

    beforeEach(() => {
        mockUser = createMockUser();
        mockPhoto = createMockPhoto();
        mockPost = createMockPost(mockUser, [mockPhoto]);

        mockPostRepository = {
            find: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        };

        (getRepository as jest.Mock).mockReturnValue(mockPostRepository);

        mockRequest = {};
        mockResponse = {
            json: jest.fn().mockReturnThis() as unknown as Response['json'],
            status: jest.fn().mockReturnThis() as unknown as Response['status'],
            send: jest.fn().mockReturnThis() as unknown as Response['send']
        };

        postController = new PostController();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllPosts', () => {
        it('должен возвращать все посты', async () => {
            const mockPosts = [mockPost];
            mockPostRepository.find.mockResolvedValue(mockPosts);

            await postController.getAllPosts(mockRequest as Request, mockResponse as Response);

            expect(mockPostRepository.find).toHaveBeenCalledWith({
                relations: ['author', 'photos'],
                order: { createdAt: 'DESC' }
            });
            expect(mockResponse.json).toHaveBeenCalledWith(mockPosts);
        });

        it('должен обрабатывать ошибки при получении постов', async () => {
            const error = new Error('Ошибка базы данных');
            mockPostRepository.find.mockRejectedValue(error);

            await postController.getAllPosts(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Ошибка при получении постов',
                error
            });
        });
    });

    describe('getPostById', () => {
        it('должен возвращать пост по ID', async () => {
            mockRequest.params = { id: '1' };
            mockPostRepository.findOne.mockResolvedValue(mockPost);

            await postController.getPostById(mockRequest as Request, mockResponse as Response);

            expect(mockPostRepository.findOne).toHaveBeenCalledWith({
                where: { id: 1 },
                relations: ['author', 'photos']
            });
            expect(mockResponse.json).toHaveBeenCalledWith(mockPost);
        });

        it('должен возвращать 404 если пост не найден', async () => {
            mockRequest.params = { id: '999' };
            mockPostRepository.findOne.mockResolvedValue(null);

            await postController.getPostById(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Пост не найден' });
        });
    });

    describe('createPost', () => {
        it('должен создавать новый пост', async () => {
            mockRequest.body = {
                content: 'Новый пост',
                authorId: 1,
                photoIds: [1]
            };
            mockPostRepository.create.mockReturnValue(mockPost);
            mockPostRepository.save.mockResolvedValue(mockPost);
            mockPostRepository.findOne.mockResolvedValue(mockPost);

            await postController.createPost(mockRequest as Request, mockResponse as Response);

            expect(mockPostRepository.create).toHaveBeenCalledWith({
                content: 'Новый пост',
                authorId: 1,
                photos: [{ id: 1 }]
            });
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockPost);
        });

        it('должен обрабатывать ошибки при создании поста', async () => {
            mockRequest.body = { content: 'Новый пост' };
            mockPostRepository.create.mockImplementation(() => {
                throw new Error('Ошибка создания');
            });

            await postController.createPost(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Ошибка при создании поста',
                error: expect.any(Error)
            });
        });
    });

    describe('updatePost', () => {
        it('должен обновлять существующий пост', async () => {
            mockRequest.params = { id: '1' };
            mockRequest.body = {
                content: 'Обновленный пост',
                photoIds: [2]
            };
            mockPostRepository.findOne
                .mockResolvedValueOnce(mockPost)
                .mockResolvedValueOnce({ ...mockPost, content: 'Обновленный пост' });

            await postController.updatePost(mockRequest as Request, mockResponse as Response);

            expect(mockPostRepository.update).toHaveBeenCalledWith('1', {
                content: 'Обновленный пост',
                photos: [{ id: 2 }]
            });
            expect(mockResponse.json).toHaveBeenCalled();
        });

        it('должен возвращать 404 при обновлении несуществующего поста', async () => {
            mockRequest.params = { id: '999' };
            mockRequest.body = { content: 'Обновленный пост' };
            mockPostRepository.findOne.mockResolvedValue(null);

            await postController.updatePost(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Пост не найден' });
        });
    });

    describe('deletePost', () => {
        it('должен удалять существующий пост', async () => {
            mockRequest.params = { id: '1' };
            mockPostRepository.findOne.mockResolvedValue(mockPost);

            await postController.deletePost(mockRequest as Request, mockResponse as Response);

            expect(mockPostRepository.delete).toHaveBeenCalledWith('1');
            expect(mockResponse.status).toHaveBeenCalledWith(204);
            expect(mockResponse.send).toHaveBeenCalled();
        });

        it('должен возвращать 404 при удалении несуществующего поста', async () => {
            mockRequest.params = { id: '999' };
            mockPostRepository.findOne.mockResolvedValue(null);

            await postController.deletePost(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Пост не найден' });
        });
    });

    describe('getUserPosts', () => {
        it('должен возвращать посты пользователя', async () => {
            mockRequest.params = { userId: '1' };
            const userPosts = [mockPost];
            mockPostRepository.find.mockResolvedValue(userPosts);

            await postController.getUserPosts(mockRequest as Request, mockResponse as Response);

            expect(mockPostRepository.find).toHaveBeenCalledWith({
                where: { authorId: 1 },
                relations: ['author', 'photos'],
                order: { createdAt: 'DESC' }
            });
            expect(mockResponse.json).toHaveBeenCalledWith(userPosts);
        });

        it('должен обрабатывать ошибки при получении постов пользователя', async () => {
            mockRequest.params = { userId: '1' };
            const error = new Error('Ошибка базы данных');
            mockPostRepository.find.mockRejectedValue(error);

            await postController.getUserPosts(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Ошибка при получении постов пользователя',
                error
            });
        });
    });
}); 