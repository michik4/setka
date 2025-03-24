import { Post } from '../../entities/post.entity';
import { User } from '../../entities/user.entity';
import { Photo } from '../../entities/photo.entity';

export const createMockUser = (): Partial<User> => ({
    id: 1,
    firstName: 'Иван',
    lastName: 'Иванов',
    email: 'ivan@example.com',
    posts: [],
    photos: [],
    createdAt: new Date(),
    updatedAt: new Date()
});

export const createMockPhoto = (): Partial<Photo> => ({
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

export const createMockPost = (user: Partial<User>, photos: Partial<Photo>[]): Partial<Post> => ({
    id: 1,
    content: 'Тестовый пост',
    authorId: user.id,
    author: user as User,
    photos: photos as Photo[],
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    createdAt: new Date(),
    updatedAt: new Date()
}); 