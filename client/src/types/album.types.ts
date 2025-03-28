import { Photo } from './photo.types';
import { User } from './user.types';

export interface Album {
    id: number;
    title: string;
    description?: string;
    isPrivate: boolean;
    userId: number;
    user?: User;
    photos: Photo[];
    photosCount: number;
    createdAt: string;
    updatedAt: string;
} 