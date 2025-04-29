import { api } from '../utils/api';
import { MusicAlbum, Track } from '../types/music.types';

export class MusicAlbumService {
    private static API_ENDPOINT = '/music-albums';

    // Получение всех альбомов пользователя
    static async getUserAlbums(): Promise<MusicAlbum[]> {
        try {
            return await api.get(this.API_ENDPOINT);
        } catch (error) {
            console.error('Ошибка при получении альбомов пользователя:', error);
            throw error;
        }
    }

    // Получение альбомов конкретного пользователя по ID
    static async getUserAlbumsById(userId: string | number, publicOnly: boolean = false): Promise<MusicAlbum[]> {
        try {
            // В текущей реализации API нет прямого эндпоинта для получения альбомов другого пользователя
            // Поэтому используем общий метод и возвращаем пустой результат для чужих пользователей
            
            // Сейчас можно получить только свои альбомы
            if (userId !== 'current') {
                console.warn(`Эндпоинт для получения музыкальных альбомов другого пользователя (ID:${userId}) пока не реализован на сервере`);
                return [];
            }
            
            return await this.getUserAlbums();
        } catch (error) {
            console.error(`Ошибка при получении альбомов пользователя ${userId}:`, error);
            // Проверим, существует ли API эндпоинт (ошибка 404)
            if (error instanceof Error && error.message.includes('404')) {
                console.warn(`API эндпоинт ${this.API_ENDPOINT}/user/${userId} не существует, возможно, функционал еще не реализован на сервере`);
            }
            // Возвращаем пустой массив вместо исключения в любом случае
            return [];
        }
    }

    // Получение альбома по ID
    static async getAlbumById(albumId: number): Promise<MusicAlbum> {
        try {
            return await api.get(`${this.API_ENDPOINT}/${albumId}`);
        } catch (error) {
            console.error(`Ошибка при получении альбома ${albumId}:`, error);
            throw error;
        }
    }

    // Создание нового альбома
    static async createAlbum(title: string, description: string, isPrivate: boolean, trackIds?: number[]): Promise<MusicAlbum> {
        try {
            return await api.post(this.API_ENDPOINT, {
                title,
                description,
                isPrivate,
                trackIds
            });
        } catch (error) {
            console.error('Ошибка при создании музыкального альбома:', error);
            throw error;
        }
    }

    // Загрузка обложки альбома
    static async uploadAlbumCover(albumId: number, coverFile: File): Promise<MusicAlbum> {
        try {
            const formData = new FormData();
            formData.append('coverImage', coverFile);

            return await api.post(`${this.API_ENDPOINT}/${albumId}/cover`, formData);
        } catch (error) {
            console.error(`Ошибка при загрузке обложки для альбома ${albumId}:`, error);
            throw error;
        }
    }

    // Установка обложки альбома из URL трека
    static async setAlbumCoverFromUrl(albumId: number, coverUrl: string): Promise<MusicAlbum> {
        try {
            return await api.post(`${this.API_ENDPOINT}/${albumId}/cover-from-track`, {
                coverUrl
            });
        } catch (error) {
            console.error(`Ошибка при установке обложки для альбома ${albumId} из URL:`, error);
            throw error;
        }
    }

    // Обновление альбома
    static async updateAlbum(albumId: number, title: string, description: string, isPrivate: boolean, trackIds?: number[]): Promise<MusicAlbum> {
        try {
            return await api.put(`${this.API_ENDPOINT}/${albumId}`, {
                title,
                description,
                isPrivate,
                trackIds
            });
        } catch (error) {
            console.error(`Ошибка при обновлении альбома ${albumId}:`, error);
            throw error;
        }
    }

    // Удаление альбома
    static async deleteAlbum(albumId: number): Promise<void> {
        try {
            await api.delete(`${this.API_ENDPOINT}/${albumId}`);
        } catch (error) {
            console.error(`Ошибка при удалении альбома ${albumId}:`, error);
            throw error;
        }
    }

    // Добавление трека в альбом
    static async addTrackToAlbum(albumId: number, trackId: number): Promise<MusicAlbum> {
        try {
            return await api.post(`${this.API_ENDPOINT}/${albumId}/tracks`, {
                trackId
            });
        } catch (error) {
            console.error(`Ошибка при добавлении трека ${trackId} в альбом ${albumId}:`, error);
            throw error;
        }
    }

    // Удаление трека из альбома
    static async removeTrackFromAlbum(albumId: number, trackId: number): Promise<MusicAlbum> {
        try {
            return await api.delete(`${this.API_ENDPOINT}/${albumId}/tracks/${trackId}`);
        } catch (error) {
            console.error(`Ошибка при удалении трека ${trackId} из альбома ${albumId}:`, error);
            throw error;
        }
    }

    // Массовая загрузка треков в альбом
    static async uploadTracksToAlbum(albumId: number, audioFiles: File[]): Promise<{
        albumId: number;
        tracksCount: number;
        results: Array<{
            success: boolean;
            track?: Track;
            originalName?: string;
            error?: string;
        }>;
    }> {
        try {
            const formData = new FormData();
            
            // Добавляем все аудиофайлы в formData
            audioFiles.forEach(file => {
                formData.append('audioFiles', file);
            });

            return await api.post(`${this.API_ENDPOINT}/${albumId}/upload/tracks`, formData);
        } catch (error) {
            console.error(`Ошибка при массовой загрузке треков в альбом ${albumId}:`, error);
            throw error;
        }
    }
} 