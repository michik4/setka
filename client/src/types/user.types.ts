import { Photo } from './photo.types';

export interface User {
    id: number;
    firstName: string;
    lastName: string;
    nickname?: string;
    email: string;
    status?: string;
    avatar?: Photo;
    avatarId?: number;
    createdAt: string;
    updatedAt: string;
}

export interface AuthUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    nickname?: string;
} 