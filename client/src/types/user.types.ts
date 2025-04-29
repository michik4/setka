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
    friendshipStatus?: 'none' | 'pending_sent' | 'pending_received' | 'friends';
}

export interface AuthUser {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    nickname?: string;
    avatar?: Photo;
    avatarId?: number;
}

export interface FriendRequest {
    id: number;
    senderId: number;
    receiverId: number;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
    updatedAt: string;
    sender?: User;
    receiver?: User;
}

export interface FriendRequestWithUser extends FriendRequest {
    sender: User;
    receiver: User;
} 