import { User } from './user.types';
import { Photo } from './photo.types';

export interface Group {
    id: number;
    name: string;
    slug: string;
    description?: string;
    creatorId: number;
    creator?: User;
    avatarId?: number;
    avatar?: Photo;
    coverId?: number;
    cover?: Photo;
    isPrivate: boolean;
    membersCount?: number;
    adminsCount?: number;
    postsCount?: number;
    createdAt: string;
    updatedAt: string;
}

export interface GroupMember {
    groupId: number;
    userId: number;
    user?: User;
    joinedAt?: string;
}

export interface GroupAdmin {
    groupId: number;
    userId: number;
    user?: User;
    assignedAt?: string;
}

export interface CreateGroupData {
    name: string;
    slug: string;
    description?: string;
    isPrivate?: boolean;
    avatarId?: number;
    coverId?: number;
}

export interface UpdateGroupData {
    name?: string;
    description?: string;
    isPrivate?: boolean;
    avatarId?: number;
    coverId?: number;
} 