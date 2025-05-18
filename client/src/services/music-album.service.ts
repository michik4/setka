import { api } from '../utils/api';
import { MusicAlbum, Track } from '../types/music.types';

export class MusicAlbumService {
    private static API_ENDPOINT = '/music/albums';

    // Получение всех альбомов пользователя
    static async getUserAlbums(): Promise<MusicAlbum[]> {
        try {
            console.log('[MusicAlbumService] Запрос альбомов пользователя из библиотеки...');
            const response = await api.get(`${this.API_ENDPOINT}/user/current`);
            console.log(`[MusicAlbumService] Получено ответ при запросе альбомов пользователя:`, response);
            
            // Проверяем формат ответа: если это массив, используем его напрямую,
            // если это объект с полем albums, используем это поле
            if (Array.isArray(response)) {
                console.log(`[MusicAlbumService] Получен массив из ${response.length} альбомов`);
                return response;
            } else if (response && typeof response === 'object' && response.albums) {
                console.log(`[MusicAlbumService] Получен объект с ${response.albums.length} альбомами`);
                return response.albums || [];
            }
            
            // Если не подходит ни один из форматов, возвращаем пустой массив
            console.warn(`[MusicAlbumService] Неожиданный формат ответа:`, response);
            return [];
        } catch (error) {
            console.error('[MusicAlbumService] Ошибка при получении альбомов пользователя:', error);
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

    // Добавление альбома в библиотеку пользователя
    static async addAlbumToLibrary(albumId: number): Promise<{success: boolean, message: string, album?: MusicAlbum, alreadyExists?: boolean}> {
        try {
            console.log(`[MusicAlbumService] Добавление альбома ${albumId} в библиотеку...`);
            const response = await api.post(`${this.API_ENDPOINT}/${albumId}/add-to-library`, {});
            console.log(`[MusicAlbumService] Альбом ${albumId} успешно добавлен в библиотеку`);
            return {
                success: true,
                message: 'Альбом успешно добавлен в библиотеку',
                album: response
            };
        } catch (error: any) {
            console.error(`[MusicAlbumService] Ошибка при добавлении альбома ${albumId} в библиотеку:`, error);
            
            // Обработка ошибки "альбом уже в библиотеке"
            if (error?.message?.includes('уже существует в вашей библиотеке')) {
                console.log(`[MusicAlbumService] Альбом ${albumId} уже в библиотеке пользователя`);
                
                // Если в ошибке есть информация об альбоме, извлекаем ее
                let existingAlbum: MusicAlbum | undefined;
                try {
                    // Пытаемся извлечь данные альбома из ответа сервера
                    if (error.response?.data?.album) {
                        existingAlbum = error.response.data.album;
                        console.log(`[MusicAlbumService] Извлечены данные существующего альбома:`, existingAlbum);
                    }
                } catch (parseError) {
                    console.warn(`[MusicAlbumService] Не удалось извлечь данные альбома из ошибки:`, parseError);
                }
                
                return {
                    success: false,
                    message: error.message || 'Альбом уже существует в вашей библиотеке',
                    alreadyExists: true,
                    album: existingAlbum
                };
            }
            
            // Другие ошибки
            throw error;
        }
    }

    // Удаление альбома из библиотеки пользователя
    static async removeAlbumFromLibrary(albumId: number): Promise<{success: boolean, message: string}> {
        try {
            console.log(`[MusicAlbumService] Удаление альбома ${albumId} из библиотеки...`);
            await api.delete(`${this.API_ENDPOINT}/${albumId}/remove-from-library`);
            console.log(`[MusicAlbumService] Альбом ${albumId} успешно удален из библиотеки`);
            return {
                success: true,
                message: 'Альбом успешно удален из библиотеки'
            };
        } catch (error: any) {
            console.error(`[MusicAlbumService] Ошибка при удалении альбома ${albumId} из библиотеки:`, error);
            throw error;
        }
    }

    // Проверка наличия альбома в библиотеке пользователя
    static async isAlbumInLibrary(albumId: number): Promise<boolean> {
        try {
            console.log(`[MusicAlbumService] Проверка наличия альбома ID:${albumId} в библиотеке...`);
            const response = await api.get(`${this.API_ENDPOINT}/${albumId}/in-library`);
            
            // Проверяем структуру ответа
            if (response && typeof response === 'object' && 'inLibrary' in response) {
                console.log(`[MusicAlbumService] Получен ответ для альбома ID:${albumId}: inLibrary=${response.inLibrary}`);
                return response.inLibrary === true;
            }
            
            console.warn(`[MusicAlbumService] Неожиданный формат ответа от сервера при проверке наличия альбома ${albumId} в библиотеке:`, response);
            return false;
        } catch (error) {
            // Подробнее логируем ошибку
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
            const errorStatus = error && (error as any).response?.status || 'Неизвестный статус';
            
            console.error(`[MusicAlbumService] Ошибка при проверке наличия альбома ${albumId} в библиотеке через API: ${errorStatus} - ${errorMessage}`);
            
            // Не делаем никаких дополнительных проверок, просто возвращаем false
            return false;
        }
    }

    // Получение альбомов конкретного пользователя
    static async getUserAlbumsByUserId(userId: number | string) {
        try {
            console.log(`[MusicAlbumService] Запрос альбомов пользователя ${userId}`);
            const url = `/music/albums/user/${userId}`;
            console.log(`[MusicAlbumService] URL запроса: ${url}`);
            
            const response = await api.get(url);
            console.log(`[MusicAlbumService] Получены альбомы пользователя ${userId}:`, response);
            
            // Проверяем формат ответа: если это массив, используем его напрямую,
            // если это объект с полем albums, используем это поле
            if (Array.isArray(response)) {
                console.log(`[MusicAlbumService] Получен массив из ${response.length} альбомов`);
                return response;
            } else if (response && typeof response === 'object' && response.albums) {
                console.log(`[MusicAlbumService] Получен объект с ${response.albums.length} альбомами`);
                return response.albums || [];
            }
            
            // Если не подходит ни один из форматов, возвращаем пустой массив
            console.warn(`[MusicAlbumService] Неожиданный формат ответа:`, response);
            return [];
        } catch (error) {
            console.error(`[MusicAlbumService] Ошибка при получении альбомов пользователя ${userId}:`, error);
            return [];
        }
    }

    // Получение альбомов из библиотеки пользователя
    static async getUserLibraryAlbumsByUserId(userId: number | string) {
        try {
            console.log(`[MusicAlbumService] Запрос альбомов из библиотеки пользователя ${userId}`);
            const url = `/music/albums/library/${userId}`;
            console.log(`[MusicAlbumService] URL запроса: ${url}`);
            
            const response = await api.get(url);
            console.log(`[MusicAlbumService] Получены альбомы из библиотеки пользователя ${userId}:`, response);
            
            // Проверяем формат ответа: если это массив, используем его напрямую,
            // если это объект с полем albums, используем это поле
            if (Array.isArray(response)) {
                console.log(`[MusicAlbumService] Получен массив из ${response.length} альбомов из библиотеки`);
                return response;
            } else if (response && typeof response === 'object' && response.albums) {
                console.log(`[MusicAlbumService] Получен объект с ${response.albums.length} альбомами из библиотеки`);
                return response.albums || [];
            }
            
            // Если не подходит ни один из форматов, возвращаем пустой массив
            console.warn(`[MusicAlbumService] Неожиданный формат ответа:`, response);
            return [];
        } catch (error) {
            console.error(`[MusicAlbumService] Ошибка при получении альбомов из библиотеки пользователя ${userId}:`, error);
            return [];
        }
    }

    // Получение треков альбома с пагинацией
    static async getAlbumTracks(
        albumId: number, 
        page: number = 1, 
        limit: number = 10,
        sortBy: string = 'id',
        sortOrder: 'asc' | 'desc' = 'asc'
    ): Promise<{
        tracks: Track[],
        pagination: {
            page: number,
            limit: number,
            totalTracks: number,
            totalPages: number,
            hasMore: boolean
        }
    }> {
        try {
            console.log(`[MusicAlbumService] Запрос треков альбома ${albumId}, страница ${page}, лимит ${limit}, сортировка: ${sortBy} ${sortOrder}`);
            const response = await api.get(
                `${this.API_ENDPOINT}/${albumId}/tracks?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`
            );
            
            console.log(`[MusicAlbumService] Получено ${response.tracks?.length} треков для альбома ${albumId}, страница ${page}/${response.pagination?.totalPages || 1}`);
            return response;
        } catch (error) {
            console.error(`[MusicAlbumService] Ошибка при получении треков альбома ${albumId}:`, error);
            throw error;
        }
    }
}