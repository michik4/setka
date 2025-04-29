import { api, tokenService } from '../utils/api';
import { Track } from '../types/music.types';
import { API_URL } from '../config/constants';

export class MusicService {
    static API_ENDPOINT = '/music';

    // Получение всех треков пользователя
    static async getUserTracks(limit: number = 1000): Promise<{ tracks: Track[], totalTracks: number }> {
        try {
            return await api.get(`${this.API_ENDPOINT}?limit=${limit}`);
        } catch (error) {
            console.error('Ошибка при получении треков пользователя:', error);
            throw error;
        }
    }

    // Получение треков конкретного пользователя по ID
    static async getUserTracksById(userId: string | number, limit: number = 1000): Promise<{ tracks: Track[], totalTracks: number }> {
        try {
            // В текущей реализации API нет прямого эндпоинта для получения треков другого пользователя
            // Поэтому используем общий метод и возвращаем пустой результат для чужих пользователей
            
            // Сейчас можно получить только свои треки
            if (userId !== 'current') {
                console.warn(`Эндпоинт для получения треков другого пользователя (ID:${userId}) пока не реализован на сервере`);
                return { tracks: [], totalTracks: 0 };
            }
            
            return await this.getUserTracks(limit);
        } catch (error) {
            console.error(`Ошибка при получении треков пользователя ${userId}:`, error);
            // Проверим, существует ли API эндпоинт (ошибка 404)
            if (error instanceof Error && error.message.includes('404')) {
                console.warn(`API эндпоинт ${this.API_ENDPOINT}/user/${userId} не существует, возможно, функционал еще не реализован на сервере`);
            }
            // Возвращаем пустой объект вместо исключения в любом случае
            return { tracks: [], totalTracks: 0 };
        }
    }

    // Получение трека по ID
    static async getTrackById(trackId: number): Promise<Track> {
        try {
            return await api.get(`${this.API_ENDPOINT}/${trackId}`);
        } catch (error) {
            console.error(`Ошибка при получении трека ${trackId}:`, error);
            throw error;
        }
    }

    // Загрузка нового трека
    static async uploadTrack(formData: FormData): Promise<Track> {
        try {
            // Получаем токен
            const token = tokenService.getToken();
            const headers: HeadersInit = {};
            
            // Добавляем токен в заголовки, если он есть
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
            
            const response = await fetch(`${API_URL}${this.API_ENDPOINT}/upload`, {
                method: 'POST',
                body: formData,
                headers
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Ошибка при загрузке трека:', error);
            throw error;
        }
    }

    // Удаление трека
    static async deleteTrack(trackId: number): Promise<void> {
        try {
            await api.delete(`${this.API_ENDPOINT}/${trackId}`);
        } catch (error) {
            console.error(`Ошибка при удалении трека ${trackId}:`, error);
            throw error;
        }
    }

    // Обновление количества прослушиваний трека
    static async incrementPlayCount(trackId: number): Promise<void> {
        try {
            await api.post(`${this.API_ENDPOINT}/${trackId}/play`, {});
        } catch (error) {
            console.error(`Ошибка при обновлении количества прослушиваний трека ${trackId}:`, error);
            // Не выбрасываем ошибку, чтобы не прерывать воспроизведение
        }
    }
    
    // Добавление трека в библиотеку пользователя
    static async addTrackToLibrary(trackId: number): Promise<void> {
        try {
            await api.post(`${this.API_ENDPOINT}/${trackId}/add-to-library`, {});
        } catch (error) {
            console.error(`Ошибка при добавлении трека ${trackId} в библиотеку:`, error);
            throw error;
        }
    }
    
    // Удаление трека из библиотеки пользователя
    static async removeTrackFromLibrary(trackId: number): Promise<void> {
        try {
            await api.delete(`${this.API_ENDPOINT}/${trackId}/remove-from-library`);
        } catch (error) {
            console.error(`Ошибка при удалении трека ${trackId} из библиотеки:`, error);
            throw error;
        }
    }
} 