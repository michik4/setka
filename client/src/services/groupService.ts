import { API_URL } from '../config';
import { Group, CreateGroupData, UpdateGroupData } from '../types/group.types';
import { User } from '../types/user.types';
import { Post } from '../types/post.types';
import { Photo } from '../types/photo.types';
import { Album } from '../types/album.types';
import { Track, MusicAlbum } from '../types/music.types';
import { tokenService } from '../utils/api';

// Функция для добавления Authorization заголовка
const addAuthHeader = (): HeadersInit => {
    const token = tokenService.getToken();
    const headers: HeadersInit = {};
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
};

export const groupService = {
    async getAllGroups(limit: number = 10, offset: number = 0): Promise<{ items: Group[], total: number }> {
        const response = await fetch(`${API_URL}/groups?limit=${limit}&offset=${offset}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении списка групп');
        }
        
        return await response.json();
    },
    
    async searchGroups(query: string, limit: number = 10, offset: number = 0): Promise<{ items: Group[], total: number }> {
        const response = await fetch(`${API_URL}/groups/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при поиске групп');
        }
        
        return await response.json();
    },
    
    async getUserGroups(): Promise<Group[]> {
        const response = await fetch(`${API_URL}/groups/user`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении групп пользователя');
        }
        
        return await response.json();
    },
    
    async getGroupById(id: number): Promise<Group> {
        const response = await fetch(`${API_URL}/groups/${id}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении информации о группе');
        }
        
        return await response.json();
    },
    
    async getGroupBySlug(slug: string): Promise<Group> {
        const response = await fetch(`${API_URL}/groups/slug/${slug}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении информации о группе');
        }
        
        return await response.json();
    },
    
    async createGroup(data: CreateGroupData): Promise<Group> {
        const response = await fetch(`${API_URL}/groups`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...addAuthHeader()
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при создании группы');
        }
        
        return await response.json();
    },
    
    async updateGroup(id: number, data: UpdateGroupData): Promise<Group> {
        const response = await fetch(`${API_URL}/groups/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                ...addAuthHeader()
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при обновлении группы');
        }
        
        return await response.json();
    },
    
    async deleteGroup(id: number): Promise<void> {
        const response = await fetch(`${API_URL}/groups/${id}`, {
            method: 'DELETE',
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при удалении группы');
        }
    },
    
    async getGroupMembers(id: number): Promise<User[]> {
        const response = await fetch(`${API_URL}/groups/${id}/members`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении участников группы');
        }
        
        return await response.json();
    },
    
    async getGroupAdmins(id: number): Promise<User[]> {
        const response = await fetch(`${API_URL}/groups/${id}/admins`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении администраторов группы');
        }
        
        return await response.json();
    },
    
    async joinGroup(id: number): Promise<void> {
        const response = await fetch(`${API_URL}/groups/${id}/join`, {
            method: 'POST',
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при вступлении в группу');
        }
    },
    
    async leaveGroup(id: number): Promise<void> {
        const response = await fetch(`${API_URL}/groups/${id}/leave`, {
            method: 'POST',
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при выходе из группы');
        }
    },
    
    async addAdmin(groupId: number, userId: number): Promise<void> {
        const response = await fetch(`${API_URL}/groups/${groupId}/admins`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...addAuthHeader()
            },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при добавлении администратора');
        }
    },
    
    async removeAdmin(groupId: number, userId: number): Promise<void> {
        const response = await fetch(`${API_URL}/groups/${groupId}/admins`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                ...addAuthHeader()
            },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при удалении администратора');
        }
    },
    
    async removeMember(groupId: number, userId: number): Promise<void> {
        const response = await fetch(`${API_URL}/groups/${groupId}/members/${userId}`, {
            method: 'DELETE',
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при удалении участника');
        }
    },
    
    async banMember(groupId: number, userId: number): Promise<void> {
        const response = await fetch(`${API_URL}/groups/${groupId}/ban`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...addAuthHeader()
            },
            body: JSON.stringify({ userId })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при бане участника');
        }
    },
    
    async getGroupPosts(groupId: number, limit: number = 10, offset: number = 0): Promise<Post[]> {
        const response = await fetch(`${API_URL}/groups/${groupId}/posts?limit=${limit}&offset=${offset}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении постов группы');
        }
        
        return await response.json();
    },
    
    /**
     * @deprecated Используйте CreatePostForm компонент с параметром groupId вместо этого метода
     */
    async createGroupPost(groupId: number, content: string): Promise<Post> {
        const response = await fetch(`${API_URL}/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...addAuthHeader()
            },
            body: JSON.stringify({
                content,
                groupId
            })
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при создании поста в группе');
        }
        
        return await response.json();
    },
    
    async getUserAdminGroups(userId: number): Promise<Group[]> {
        const response = await fetch(`${API_URL}/groups/user/${userId}/admin`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении групп, где пользователь является администратором');
        }
        
        const data = await response.json();
        console.log('API ответ - группы администратора:', data);
        return data;
    },
    
    async getGroupMediaPhotos(groupId: number, limit: number = 20, offset: number = 0): Promise<{ items: Photo[], total: number }> {
        const response = await fetch(`${API_URL}/groups/${groupId}/media/photos?limit=${limit}&offset=${offset}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении фотографий группы');
        }
        
        return await response.json();
    },
    
    async getGroupMediaAlbums(groupId: number, limit: number = 20, offset: number = 0): Promise<{ items: Album[], total: number }> {
        const response = await fetch(`${API_URL}/groups/${groupId}/media/albums?limit=${limit}&offset=${offset}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении альбомов группы');
        }
        
        return await response.json();
    },
    
    async getGroupMediaTracks(groupId: number, limit: number = 20, offset: number = 0): Promise<{ items: Track[], total: number }> {
        const response = await fetch(`${API_URL}/groups/${groupId}/media/tracks?limit=${limit}&offset=${offset}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении треков группы');
        }
        
        return await response.json();
    },
    
    async getGroupMediaMusicAlbums(groupId: number, limit: number = 20, offset: number = 0): Promise<{ items: MusicAlbum[], total: number }> {
        const response = await fetch(`${API_URL}/groups/${groupId}/media/music-albums?limit=${limit}&offset=${offset}`, {
            headers: addAuthHeader()
        });
        
        if (!response.ok) {
            throw new Error('Ошибка при получении музыкальных альбомов группы');
        }
        
        return await response.json();
    }
}; 