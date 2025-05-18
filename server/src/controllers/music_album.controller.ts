import { Request, Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import { MusicAlbum } from '../entities/music_album.entity';
import { MusicTrack } from '../entities/music.entity';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PostMusicAlbum } from '../entities/post_music_album.entity';

export class MusicAlbumController {
    private albumRepository = AppDataSource.getRepository(MusicAlbum);
    private trackRepository = AppDataSource.getRepository(MusicTrack);

    // Создание нового музыкального альбома
    async createAlbum(req: AuthenticatedRequest, res: Response) {
        try {
            const { title, description, isPrivate, trackIds } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const album = this.albumRepository.create({
                title,
                description,
                userId,
                isPrivate: isPrivate || false,
                tracks: [],
                tracksCount: 0
            });

            await this.albumRepository.save(album);

            if (trackIds && trackIds.length > 0) {
                const tracks = await this.trackRepository
                    .createQueryBuilder('track')
                    .where('track.id IN (:...ids)', { ids: trackIds })
                    .andWhere('track.userId = :userId', { userId })
                    .getMany();
                
                album.tracks = tracks;
                album.tracksCount = tracks.length;
                await this.albumRepository.save(album);
            }

            // Загружаем альбом с треками для ответа
            const albumWithTracks = await this.albumRepository.findOne({
                where: { id: album.id },
                relations: ['tracks']
            });

            return res.status(201).json(albumWithTracks);
        } catch (error) {
            console.error('Ошибка при создании музыкального альбома:', error);
            return res.status(500).json({ message: 'Ошибка при создании музыкального альбома' });
        }
    }

    // Получение всех альбомов пользователя
    async getUserAlbums(req: AuthenticatedRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const albums = await this.albumRepository.find({
                where: { 
                    userId,
                    isInLibrary: true // Возвращаем только альбомы, которые находятся в библиотеке
                },
                order: { createdAt: 'DESC' }
            });

            console.log(`[MusicAlbumController] Найдено ${albums.length} альбомов в библиотеке пользователя ID:${userId}`);
            return res.status(200).json(albums);
        } catch (error) {
            console.error('Ошибка при получении альбомов пользователя:', error);
            return res.status(500).json({ message: 'Ошибка при получении альбомов' });
        }
    }

    // Получение альбома по ID
    async getAlbumById(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав доступа
            if (album.userId !== userId && album.isPrivate) {
                return res.status(403).json({ message: 'Нет доступа к этому альбому' });
            }

            return res.status(200).json(album);
        } catch (error) {
            console.error(`Ошибка при получении альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при получении альбома' });
        }
    }

    // Обновление альбома
    async updateAlbum(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const { title, description, isPrivate, trackIds } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }

            // Обновляем основные данные
            album.title = title || album.title;
            album.description = description !== undefined ? description : album.description;
            album.isPrivate = isPrivate !== undefined ? isPrivate : album.isPrivate;

            // Обновляем список треков, если он был предоставлен
            if (trackIds && trackIds.length > 0) {
                const tracks = await this.trackRepository
                    .createQueryBuilder('track')
                    .where('track.id IN (:...ids)', { ids: trackIds })
                    .andWhere('track.userId = :userId', { userId })
                    .getMany();
                
                album.tracks = tracks;
                album.tracksCount = tracks.length;
            }

            await this.albumRepository.save(album);

            return res.status(200).json(album);
        } catch (error) {
            console.error(`Ошибка при обновлении альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при обновлении альбома' });
        }
    }

    // Удаление альбома
    async deleteAlbum(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) }
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав на удаление
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на удаление этого альбома' });
            }

            // Удаляем связи с треками и затем сам альбом
            await this.albumRepository.remove(album);

            return res.status(200).json({ message: 'Альбом успешно удален' });
        } catch (error) {
            console.error(`Ошибка при удалении альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при удалении альбома' });
        }
    }

    // Добавление трека в альбом
    async addTrackToAlbum(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const { trackId } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }

            const track = await this.trackRepository.findOne({
                where: { id: parseInt(trackId) }
            });

            if (!track) {
                return res.status(404).json({ message: 'Трек не найден' });
            }

            // Проверяем, есть ли уже трек в альбоме
            const trackExists = album.tracks.some(t => t.id === track.id);
            if (trackExists) {
                return res.status(400).json({ message: 'Этот трек уже добавлен в альбом' });
            }

            // Добавляем трек в альбом
            album.tracks.push(track);
            album.tracksCount = album.tracks.length;
            await this.albumRepository.save(album);

            return res.status(200).json({ message: 'Трек успешно добавлен в альбом', album });
        } catch (error) {
            console.error(`Ошибка при добавлении трека в альбом ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при добавлении трека в альбом' });
        }
    }

    // Удаление трека из альбома
    async removeTrackFromAlbum(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId, trackId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }

            // Фильтруем треки, удаляя указанный
            album.tracks = album.tracks.filter(track => track.id !== parseInt(trackId));
            album.tracksCount = album.tracks.length;
            await this.albumRepository.save(album);

            return res.status(200).json({ message: 'Трек успешно удален из альбома', album });
        } catch (error) {
            console.error(`Ошибка при удалении трека из альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при удалении трека из альбома' });
        }
    }

    // Загрузка обложки альбома
    async uploadAlbumCover(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Файл обложки не загружен' });
            }

            const { albumId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) }
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }

            // Сохраняем ссылку на обложку в альбоме
            album.coverUrl = req.file.filename;
            await this.albumRepository.save(album);

            return res.status(200).json({
                message: 'Обложка альбома успешно загружена',
                coverUrl: album.coverUrl
            });
        } catch (error) {
            console.error(`Ошибка при загрузке обложки альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при загрузке обложки альбома' });
        }
    }

    // Массовая загрузка треков в альбом
    async uploadTracksToAlbum(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const userId = req.user?.id;
            const audioFiles = req.files as Express.Multer.File[];

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            if (!audioFiles || audioFiles.length === 0) {
                return res.status(400).json({ message: 'Аудиофайлы не загружены' });
            }

            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }

            const results = [];
            const musicController = await import('../controllers/music.controller');
            const controller = new musicController.MusicController();

            // Обрабатываем каждый загруженный файл
            for (const audioFile of audioFiles) {
                try {
                    // Используем существующий метод для загрузки треков
                    const track = await controller.uploadTrack(req, audioFile, null);
                    
                    // Добавляем трек в альбом
                    if (!album.tracks.some(t => t.id === track.id)) {
                        album.tracks.push(track);
                        results.push({
                            success: true,
                            track: {
                                id: track.id,
                                title: track.title,
                                artist: track.artist,
                                duration: track.duration,
                                coverUrl: track.coverUrl
                            }
                        });
                    } else {
                        results.push({
                            success: false,
                            originalName: audioFile.originalname,
                            error: 'Трек уже существует в альбоме'
                        });
                    }
                } catch (error) {
                    results.push({
                        success: false,
                        originalName: audioFile.originalname,
                        error: error instanceof Error ? error.message : 'Ошибка при обработке файла'
                    });
                }
            }

            // Обновляем счетчик треков и сохраняем альбом
            album.tracksCount = album.tracks.length;
            await this.albumRepository.save(album);

            return res.status(200).json({
                message: 'Треки успешно загружены',
                albumId: album.id,
                tracksCount: album.tracksCount,
                results
            });
        } catch (error) {
            console.error(`Ошибка при загрузке треков в альбом ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при загрузке треков в альбом' });
        }
    }

    // Установка обложки альбома из URL трека
    async setCoverFromUrl(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const { coverUrl } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            if (!coverUrl) {
                return res.status(400).json({ message: 'URL обложки не указан' });
            }

            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) }
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав на редактирование
            if (album.userId !== userId) {
                return res.status(403).json({ message: 'Нет прав на редактирование этого альбома' });
            }

            // Устанавливаем URL обложки из трека
            album.coverUrl = coverUrl;
            await this.albumRepository.save(album);

            return res.status(200).json({
                message: 'Обложка альбома успешно обновлена',
                album
            });
        } catch (error) {
            console.error(`Ошибка при установке обложки для альбома ${req.params.albumId}:`, error);
            return res.status(500).json({ message: 'Ошибка при установке обложки альбома' });
        }
    }

    // Добавление альбома в библиотеку пользователя
    async addAlbumToLibrary(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            // Находим оригинальный альбом
            const sourceAlbum = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });

            if (!sourceAlbum) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверяем, является ли альбом уже удаленным из библиотеки пользователя
            if (sourceAlbum.userId === userId) {
                // Если альбом уже принадлежит пользователю, но был удален из библиотеки
                if (!sourceAlbum.isInLibrary) {
                    // Просто помечаем, что альбом снова в библиотеке
                    sourceAlbum.isInLibrary = true;
                    await this.albumRepository.save(sourceAlbum);
                    
                    console.log(`[MusicAlbumController] Альбом "${sourceAlbum.title}" (ID:${albumId}) восстановлен в библиотеке пользователя ID:${userId}`);
                    
                    return res.status(200).json({
                        success: true,
                        message: 'Альбом возвращен в вашу библиотеку',
                        album: sourceAlbum
                    });
                } else {
                    // Альбом уже в библиотеке
                    return res.status(400).json({ 
                        message: 'Альбом уже находится в вашей библиотеке',
                        album: sourceAlbum
                    });
                }
            }

            // Проверяем, есть ли у пользователя такой же альбом
            const existingAlbum = await this.albumRepository.findOne({
                where: {
                    userId,
                    title: sourceAlbum.title,
                    isInLibrary: true
                }
            });

            if (existingAlbum) {
                return res.status(400).json({ 
                    message: 'Альбом с таким названием уже существует в вашей библиотеке',
                    album: existingAlbum 
                });
            }

            // Создаем новую запись альбома для пользователя
            const newAlbum = this.albumRepository.create({
                title: sourceAlbum.title,
                description: sourceAlbum.description,
                userId,
                coverUrl: sourceAlbum.coverUrl,
                isPrivate: false, // По умолчанию делаем альбом публичным в библиотеке пользователя
                isInLibrary: true, // Специально отмечаем, что альбом в библиотеке
                tracks: [] // Треки добавим отдельно
            });

            await this.albumRepository.save(newAlbum);

            // Добавляем треки из исходного альбома в новый
            if (sourceAlbum.tracks && sourceAlbum.tracks.length > 0) {
                // Для каждого трека из оригинального альбома
                for (const track of sourceAlbum.tracks) {
                    // Проверяем, есть ли такой трек у пользователя
                    let userTrack = await this.trackRepository.findOne({
                        where: {
                            userId,
                            title: track.title,
                            artist: track.artist
                        }
                    });

                    // Если трека нет, создаем его в библиотеке пользователя
                    if (!userTrack) {
                        userTrack = this.trackRepository.create({
                            title: track.title,
                            artist: track.artist,
                            duration: track.duration,
                            filename: track.filename,
                            filepath: track.filepath,
                            coverUrl: track.coverUrl,
                            userId,
                            playCount: 0
                        });

                        await this.trackRepository.save(userTrack);
                    }

                    // Добавляем трек в новый альбом
                    newAlbum.tracks.push(userTrack);
                }

                // Обновляем альбом с треками
                newAlbum.tracksCount = newAlbum.tracks.length;
                await this.albumRepository.save(newAlbum);
            }

            return res.status(200).json({
                success: true,
                message: 'Альбом добавлен в вашу библиотеку',
                album: newAlbum
            });
        } catch (error) {
            console.error(`[MusicAlbumController] Ошибка при добавлении альбома ${req.params.albumId} в библиотеку:`, error);
            return res.status(500).json({ message: 'Ошибка при добавлении альбома в библиотеку' });
        }
    }

    // Удаление альбома из библиотеки пользователя
    async removeAlbumFromLibrary(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            // Проверяем наличие альбома в библиотеке пользователя
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId), userId }
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден в вашей библиотеке' });
            }

            // Проверяем, привязан ли альбом к каким-либо постам
            const postAlbumCount = await AppDataSource.getRepository(PostMusicAlbum)
                .createQueryBuilder('postMusicAlbum')
                .where('postMusicAlbum.musicAlbumId = :albumId', { albumId: album.id })
                .getCount();
            
            console.log(`[MusicAlbumController] Альбом ${albumId} привязан к ${postAlbumCount} постам`);
            
            // Вместо удаления альбома, помечаем его как не входящий в библиотеку
            album.isInLibrary = false;
                
            // Сохраняем обновленный статус альбома
            await this.albumRepository.save(album);
            
            console.log(`[MusicAlbumController] Альбом ${albumId} помечен как удаленный из библиотеки пользователя ${userId}`);
                
            return res.status(200).json({
                success: true,
                message: 'Альбом удален из вашей библиотеки'
            });
        } catch (error) {
            console.error(`[MusicAlbumController] Ошибка при удалении альбома ${req.params.albumId} из библиотеки:`, error);
            return res.status(500).json({ message: 'Ошибка при удалении альбома из библиотеки' });
        }
    }

    // Проверка наличия альбома в библиотеке пользователя
    async checkAlbumInLibrary(albumId: number, userId: number): Promise<boolean> {
        try {
            console.log(`[MusicAlbumController] Проверка наличия альбома ID:${albumId} в библиотеке пользователя ID:${userId}`);
            
            // Находим альбом по ID
            const album = await this.albumRepository.findOne({
                where: { id: albumId }
            });
            
            if (!album) {
                console.error(`[MusicAlbumController] Альбом с ID:${albumId} не найден`);
                return false;
            }
            
            console.log(`[MusicAlbumController] Оригинальный альбом: "${album.title}" (ID:${album.id})`);
            
            // 1. Проверка - принадлежит ли альбом пользователю и находится ли он в библиотеке
            if (album.userId === userId) {
                // Проверяем флаг isInLibrary
                if (album.isInLibrary) {
                    console.log(`[MusicAlbumController] Альбом "${album.title}" (ID:${albumId}) найден в библиотеке пользователя`);
                    return true;
                } else {
                    console.log(`[MusicAlbumController] Альбом "${album.title}" (ID:${albumId}) принадлежит пользователю, но был удален из библиотеки (isInLibrary=false)`);
                    return false;
                }
            }
            
            // 2. Проверка - есть ли копия альбома у пользователя с таким же названием
            const albumByTitleCheck = await this.albumRepository.findOne({
                where: {
                    title: album.title,
                    userId: userId,
                    isInLibrary: true
                }
            });
            
            if (albumByTitleCheck) {
                console.log(`[MusicAlbumController] Альбом "${album.title}" найден в библиотеке пользователя по названию (ID:${albumByTitleCheck.id})`);
                return true;
            }
            
            console.log(`[MusicAlbumController] Альбом "${album.title}" (ID:${albumId}) НЕ найден в библиотеке пользователя ID:${userId}`);
            return false;
        } catch (error) {
            console.error(`[MusicAlbumController] Ошибка при проверке наличия альбома в библиотеке:`, error);
            return false;
        }
    }

    // Получение публичных альбомов конкретного пользователя
    async getPublicUserAlbums(userId: number, res: Response) {
        try {
            console.log(`[MusicAlbumController] Запрос на получение публичных альбомов пользователя ID:${userId}`);
            
            // Получаем все публичные альбомы пользователя
            const albums = await this.albumRepository.find({
                where: { 
                    userId: userId,
                    isPrivate: false,  // Только публичные альбомы
                    isInLibrary: true  // Только те, что находятся в библиотеке
                },
                order: { createdAt: 'DESC' }
            });
            
            console.log(`[MusicAlbumController] Найдено ${albums.length} публичных альбомов пользователя ID:${userId}`);
            
            return res.status(200).json({
                albums,
                message: 'Публичные альбомы пользователя успешно получены'
            });
        } catch (error) {
            console.error(`[MusicAlbumController] Ошибка при получении публичных альбомов пользователя ID:${userId}:`, error);
            return res.status(500).json({ message: 'Ошибка при получении альбомов' });
        }
    }

    // Получение альбомов из библиотеки пользователя
    async getUserLibraryAlbums(userId: number, res: Response) {
        try {
            console.log(`[MusicAlbumController] Запрос на получение альбомов из библиотеки пользователя ID:${userId}`);
            
            // Получаем все альбомы пользователя, которые находятся в его библиотеке
            const albums = await this.albumRepository.find({
                where: { 
                    userId: userId,
                    isInLibrary: true  // Только те, что находятся в библиотеке
                },
                order: { createdAt: 'DESC' }
            });
            
            console.log(`[MusicAlbumController] Найдено ${albums.length} альбомов в библиотеке пользователя ID:${userId}`);
            
            return res.status(200).json({
                albums,
                message: 'Альбомы из библиотеки пользователя успешно получены'
            });
        } catch (error) {
            console.error(`[MusicAlbumController] Ошибка при получении альбомов из библиотеки пользователя ID:${userId}:`, error);
            return res.status(500).json({ message: 'Ошибка при получении альбомов из библиотеки' });
        }
    }

    // Получение треков альбома с пагинацией
    async getAlbumTracks(req: AuthenticatedRequest, res: Response) {
        try {
            const { albumId } = req.params;
            const userId = req.user?.id;
            const { page = 1, limit = 10, sortBy = 'id', sortOrder = 'asc' } = req.query;

            // Преобразуем параметры в числа
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 10;
            const offset = (pageNum - 1) * limitNum;

            if (!userId) {
                return res.status(401).json({ message: 'Необходима авторизация' });
            }

            // Получаем альбом со всеми треками для проверки прав доступа
            const album = await this.albumRepository.findOne({
                where: { id: parseInt(albumId) },
                relations: ['tracks']
            });

            if (!album) {
                return res.status(404).json({ message: 'Альбом не найден' });
            }

            // Проверка прав доступа
            if (album.userId !== userId && album.isPrivate) {
                return res.status(403).json({ message: 'Нет доступа к этому альбому' });
            }

            // Получаем общее количество треков
            const totalTracks = album.tracks?.length || 0;
            
            // Сортируем треки, если нужно
            if (album.tracks && album.tracks.length > 0) {
                const sortByField = sortBy as string;
                const sortDirection = (sortOrder as string).toLowerCase() === 'desc' ? -1 : 1;
                
                album.tracks.sort((a, b) => {
                    if (sortByField === 'title') {
                        return sortDirection * a.title.localeCompare(b.title);
                    } else if (sortByField === 'artist') {
                        return sortDirection * a.artist.localeCompare(b.artist);
                    } else if (sortByField === 'duration') {
                        return sortDirection * a.duration.localeCompare(b.duration);
                    } else {
                        // По умолчанию сортируем по ID
                        return sortDirection * (a.id - b.id);
                    }
                });
            }
            
            // Вычисляем треки для текущей страницы
            const paginatedTracks = album.tracks?.slice(offset, offset + limitNum) || [];
            
            // Вычисляем общее количество страниц
            const totalPages = Math.ceil(totalTracks / limitNum);
            const hasMore = pageNum < totalPages;

            console.log(`[MusicAlbumController] Получены треки для альбома ${albumId}, страница ${pageNum}/${totalPages}, всего треков: ${totalTracks}, сортировка: ${sortBy} ${sortOrder}`);

            return res.status(200).json({
                tracks: paginatedTracks,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    totalTracks,
                    totalPages,
                    hasMore
                }
            });
        } catch (error) {
            console.error(`[MusicAlbumController] Ошибка при получении треков альбома:`, error);
            return res.status(500).json({ message: 'Ошибка при получении треков альбома' });
        }
    }
}

export default new MusicAlbumController(); 