"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const photo_controller_1 = require("../controllers/photo.controller");
const db_connect_1 = require("../db/db_connect");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
(0, globals_1.describe)('PhotoController', () => {
    let photoController;
    let mockRequest;
    let mockResponse;
    const testUploadDir = 'uploads/photos/test';
    (0, globals_1.beforeEach)(async () => {
        // Создаем тестовую директорию
        if (!fs.existsSync(testUploadDir)) {
            fs.mkdirSync(testUploadDir, { recursive: true });
        }
        // Мокаем response
        mockResponse = {
            status: globals_1.jest.fn().mockReturnThis(),
            json: globals_1.jest.fn().mockReturnThis()
        };
        // Инициализируем контроллер
        await db_connect_1.AppDataSource.initialize();
        photoController = new photo_controller_1.PhotoController();
    });
    (0, globals_1.afterEach)(async () => {
        // Очищаем тестовую директорию
        if (fs.existsSync(testUploadDir)) {
            fs.rmSync(testUploadDir, { recursive: true });
        }
        // Закрываем соединение с БД
        await db_connect_1.AppDataSource.destroy();
    });
    (0, globals_1.describe)('uploadPhoto', () => {
        (0, globals_1.it)('should upload photo successfully', async () => {
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
                stream: {}
            };
            mockRequest = {
                file: mockFile,
                body: {
                    userId: '1',
                    description: 'Test photo'
                }
            };
            await photoController.uploadPhoto(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(201);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith(globals_1.expect.objectContaining({
                filename: mockFile.filename,
                originalName: mockFile.originalname,
                userId: 1
            }));
        });
        (0, globals_1.it)('should return 400 when no file uploaded', async () => {
            mockRequest = {
                file: undefined,
                body: {
                    userId: '1',
                    description: 'Test photo'
                }
            };
            await photoController.uploadPhoto(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(400);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({
                message: 'No file uploaded'
            });
        });
    });
    (0, globals_1.describe)('getUserPhotos', () => {
        (0, globals_1.it)('should return user photos', async () => {
            mockRequest = {
                params: {
                    userId: '1'
                }
            };
            await photoController.getUserPhotos(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('getPhotoById', () => {
        (0, globals_1.it)('should return 404 when photo not found', async () => {
            mockRequest = {
                params: {
                    id: '999'
                }
            };
            await photoController.getPhotoById(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(404);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({
                message: 'Photo not found'
            });
        });
    });
    (0, globals_1.describe)('deletePhoto', () => {
        (0, globals_1.it)('should return 404 when photo not found', async () => {
            mockRequest = {
                params: {
                    id: '999'
                }
            };
            await photoController.deletePhoto(mockRequest, mockResponse);
            (0, globals_1.expect)(mockResponse.status).toHaveBeenCalledWith(404);
            (0, globals_1.expect)(mockResponse.json).toHaveBeenCalledWith({
                message: 'Photo not found'
            });
        });
    });
});
