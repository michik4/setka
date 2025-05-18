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

    // Получение треков пользователя с пагинацией
    static async getUserTracksPaginated(page: number = 1, limit: number = 20): Promise<{ 
        tracks: Track[], 
        totalTracks?: number, 
        pagination?: {
            total: number,
            page: number,
            limit: number,
            pages: number,
            hasMore: boolean
        } 
    }> {
        try {
            console.log(`[MusicService] Запрос треков с пагинацией: страница ${page}, лимит ${limit}`);
            const result = await api.get(`${this.API_ENDPOINT}?page=${page}&limit=${limit}`);
            
            console.log('[MusicService] Получен ответ от API:', result);
            
            // Проверяем структуру ответа для совместимости с разными версиями API
            if (result && typeof result === 'object') {
                // Нормализуем ответ, обеспечивая все необходимые поля
                const normalizedResult = {
                    tracks: Array.isArray(result.tracks) ? result.tracks : [], 
                    totalTracks: result.totalTracks || result.pagination?.total || 0,
                    pagination: result.pagination || {
                        total: result.totalTracks || 0,
                        page: page,
                        limit: limit,
                        pages: Math.ceil((result.totalTracks || 0) / limit),
                        hasMore: ((page * limit) < (result.totalTracks || 0))
                    }
                };
                
                console.log('[MusicService] Нормализованный ответ:', normalizedResult);
                return normalizedResult;
            }
            
            // Если ответ не соответствует ожидаемой структуре, возвращаем пустой результат
            console.warn('[MusicService] Ответ сервера не соответствует ожидаемой структуре:', result);
            return { tracks: [], totalTracks: 0, pagination: { total: 0, page, limit, pages: 0, hasMore: false } };
        } catch (error) {
            console.error('[MusicService] Ошибка при получении треков пользователя с пагинацией:', error);
            // Вместо пробрасывания ошибки, возвращаем пустой результат
            return { tracks: [], totalTracks: 0, pagination: { total: 0, page, limit, pages: 0, hasMore: false } };
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
    
    // Проверка наличия трека в библиотеке пользователя
    static async isTrackInLibrary(trackId: number): Promise<boolean> {
        try {
            const response = await api.get(`${this.API_ENDPOINT}/${trackId}/in-library`);
            
            // Проверяем структуру ответа
            if (response && typeof response === 'object' && 'inLibrary' in response) {
                return response.inLibrary === true;
            }
            
            console.warn(`[MusicService] Неожиданный формат ответа от сервера при проверке наличия трека ${trackId} в библиотеке:`, response);
            return false;
        } catch (error) {
            console.error(`Ошибка при проверке наличия трека ${trackId} в библиотеке:`, error);
            // Не выбрасываем ошибку, просто возвращаем false
            return false;
        }
    }
    
    // Поиск треков
    static async searchTracks(query: string): Promise<{ libraryTracks: Track[], serverTracks: Track[] }> {
        try {
            const result = await api.get(`${this.API_ENDPOINT}/search?query=${encodeURIComponent(query)}`);
            return result;
        } catch (error) {
            console.error('Ошибка при поиске треков:', error);
            return { libraryTracks: [], serverTracks: [] };
        }
    }

    // Получение треков конкретного пользователя
    static async getUserTracksByUserId(userId: number, page: number = 1, limit: number = 50) {
        try {
            const response = await api.get(`/music/user/${userId}?page=${page}&limit=${limit}`);
            return response;
        } catch (error) {
            console.error(`Ошибка при получении треков пользователя ${userId}:`, error);
            return { tracks: [], pagination: { total: 0, page, limit, pages: 0, hasMore: false } };
        }
    }
    
    // Получение треков из библиотеки "Моя музыка" конкретного пользователя
    static async getUserLibraryByUserId(userId: number, page: number = 1, limit: number = 50) {
        try {
            console.log(`[MusicService] Запрос библиотеки пользователя ${userId}, страница ${page}, лимит ${limit}`);
            const url = `/music/library/${userId}?page=${page}&limit=${limit}`;
            console.log(`[MusicService] URL запроса: ${url}`);
            
            const response = await api.get(url);
            console.log(`[MusicService] Получен ответ библиотеки пользователя ${userId}:`, response);
            return response;
        } catch (error) {
            console.error(`Ошибка при получении библиотеки пользователя ${userId}:`, error);
            return { tracks: [], pagination: { total: 0, page, limit, pages: 0, hasMore: false } };
        }
    }
} 