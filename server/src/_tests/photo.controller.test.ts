import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Request, Response } from 'express';
import { PhotoController } from '../controllers/photo.controller';
import { AppDataSource } from '../db/db_connect';
import * as fs from 'fs';
import * as path from 'path';

describe('PhotoController', () => {
    let photoController: PhotoController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const testUploadDir = 'uploads/photos/test';

    beforeEach(async () => {
        // Создаем тестовую директорию
        if (!fs.existsSync(testUploadDir)) {
            fs.mkdirSync(testUploadDir, { recursive: true });
        }

        // Мокаем response
        mockResponse = {
            status: jest.fn().mockReturnThis() as unknown as Response['status'],
            json: jest.fn().mockReturnThis() as unknown as Response['json']
        };

        // Инициализируем контроллер
        await AppDataSource.initialize();
        photoController = new PhotoController();
    });

    afterEach(async () => {
        // Очищаем тестовую директорию
        if (fs.existsSync(testUploadDir)) {
            fs.rmSync(testUploadDir, { recursive: true });
        }
        
        // Закрываем соединение с БД
        await AppDataSource.destroy();
    });

    describe('uploadPhoto', () => {
        it('should upload photo successfully', async () => {
            const mockFile = {
                filename: 'test-photo.jpg',
                originalname: 'original.jpg',
                mimetype: 'image/jpeg',
                size: 1024,
                path: path.join(testUploadDir, 'test-photo.jpg'),
                fieldname: 'photo',
                encoding: '7bit',
                destination: testUploadDir,
                buffer: Buffer.from([]),
                stream: {} as any
            };

            mockRequest = {
                file: mockFile,
                body: {
                    userId: '1',
                    description: 'Test photo'
                }
            };

            await photoController.uploadPhoto(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    filename: mockFile.filename,
                    originalName: mockFile.originalname,
                    userId: 1
                })
            );
        });

        it('should return 400 when no file uploaded', async () => {
            mockRequest = {
                file: undefined,
                body: {
                    userId: '1',
                    description: 'Test photo'
                }
            };

            await photoController.uploadPhoto(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'No file uploaded'
            });
        });
    });

    describe('getUserPhotos', () => {
        it('should return user photos', async () => {
            mockRequest = {
                params: {
                    userId: '1'
                }
            };

            await photoController.getUserPhotos(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.json).toHaveBeenCalled();
        });
    });

    describe('getPhotoById', () => {
        it('should return 404 when photo not found', async () => {
            mockRequest = {
                params: {
                    id: '999'
                }
            };

            await photoController.getPhotoById(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Photo not found'
            });
        });
    });

    describe('deletePhoto', () => {
        it('should return 404 when photo not found', async () => {
            mockRequest = {
                params: {
                    id: '999'
                }
            };

            await photoController.deletePhoto(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Photo not found'
            });
        });
    });
}); 