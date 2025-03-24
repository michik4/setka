export interface User {
    id: number;
    firstName: string;
    lastName: string;
}

export interface Photo {
    id: number;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    userId: number;
    createdAt: string;
    description?: string;
}

export interface Author {
    id: number;
    firstName: string;
    lastName: string;
    nickname?: string;
    email: string;
    avatar?: Photo;
}

export interface Post {
    id: number;
    content: string;
    author: Author;
    authorId: number;
    wallOwnerId?: number;
    photos: Photo[];
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    createdAt: string;
    updatedAt: string;
    viewsCount: number;
} 