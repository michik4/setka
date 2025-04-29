import { Author } from './post.types';

export interface Comment {
    id: number;
    content: string;
    postId: number;
    authorId: number;
    author: Author;
    createdAt: string;
    parentId?: number;
    parent?: Comment;
    replies?: Comment[];
    isPostAuthor?: boolean;
    isGroupAdmin?: boolean;
} 