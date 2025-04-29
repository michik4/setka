"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockPost = exports.createMockPhoto = exports.createMockUser = void 0;
const createMockUser = () => ({
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    posts: [],
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date()
});
exports.createMockUser = createMockUser;
const createMockPhoto = () => ({
    id: 1,
    filename: 'test.jpg',
    originalName: 'test.jpg',
    path: '/uploads/test.jpg',
    mimetype: 'image/jpeg',
    size: 1024,
    userId: 1,
    description: 'Тестовая фотография',
    createdAt: new Date()
});
exports.createMockPhoto = createMockPhoto;
const createMockPost = (user, photos) => ({
    id: 1,
    content: 'Тестовый пост',
    authorId: user.id,
    author: user,
    photos: photos,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
});
exports.createMockPost = createMockPost;
