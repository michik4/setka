import { Request, Response } from 'express';
import { GroupService } from '../services/group.service';
import { UserService } from '../services/user.service';
import { PostService } from '../services/post.service';
import { PhotoService } from '../services/photo.service';
import { AuthRequest } from '../types/auth.types';
import { AppDataSource } from '../db/db_connect';

export class GroupController {
    private groupService: GroupService;
    private userService: UserService;
    private postService: PostService;
    private photoService: PhotoService;

    constructor() {
        this.groupService = new GroupService();
        this.userService = new UserService();
        this.postService = new PostService();
        this.photoService = new PhotoService();
    }

    // Создать новую группу
    createGroup = async (req: AuthRequest, res: Response) => {
        try {
            const { name, slug, description, isPrivate } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }

            if (!name || !slug) {
                return res.status(400).json({ message: 'Название и URL-адрес группы обязательны' });
            }

            // Проверяем, не занят ли slug
            const existingGroup = await this.groupService.getGroupBySlug(slug);
            if (existingGroup) {
                return res.status(400).json({ message: 'Такой URL-адрес уже занят' });
            }

            const group = await this.groupService.createGroup({
                name,
                slug,
                description,
                creatorId: userId,
                isPrivate
            });

            return res.status(201).json(group);
        } catch (error) {
            console.error('Ошибка при создании группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Получить группу по ID
    getGroupById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const group = await this.groupService.getGroupById(Number(id));

            if (!group) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            return res.json(group);
        } catch (error) {
            console.error('Ошибка при получении группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Получить группу по slug
    getGroupBySlug = async (req: Request, res: Response) => {
        try {
            const { slug } = req.params;
            const group = await this.groupService.getGroupBySlug(slug);

            if (!group) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            return res.json(group);
        } catch (error) {
            console.error('Ошибка при получении группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Обновить информацию о группе
    updateGroup = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { name, description, isPrivate } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }

            const group = await this.groupService.getGroupById(Number(id));
            
            if (!group) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            // Проверяем права доступа (создатель или администратор)
            const isCreator = group.creatorId === userId;
            const isAdmin = await this.isGroupAdmin(Number(id), userId);

            if (!isCreator && !isAdmin) {
                return res.status(403).json({ message: 'Нет прав на редактирование группы' });
            }

            const updatedGroup = await this.groupService.updateGroup(Number(id), {
                name,
                description,
                isPrivate
            });

            return res.json(updatedGroup);
        } catch (error) {
            console.error('Ошибка при обновлении группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Удалить группу
    deleteGroup = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }

            const group = await this.groupService.getGroupById(Number(id));
            
            if (!group) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            // Только создатель может удалить группу
            if (group.creatorId !== userId) {
                return res.status(403).json({ message: 'Нет прав на удаление группы' });
            }

            await this.groupService.deleteGroup(Number(id));
            return res.status(204).send();
        } catch (error) {
            console.error('Ошибка при удалении группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Получить список участников группы
    getGroupMembers = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const members = await this.groupService.getGroupMembers(Number(id));
            return res.json(members);
        } catch (error) {
            console.error('Ошибка при получении участников группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Получить список администраторов группы
    getGroupAdmins = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const admins = await this.groupService.getGroupAdmins(Number(id));
            return res.json(admins);
        } catch (error) {
            console.error('Ошибка при получении администраторов группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Вступить в группу
    joinGroup = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }

            const success = await this.groupService.addMember(Number(id), userId);
            
            if (!success) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            return res.status(200).json({ message: 'Вы успешно вступили в группу' });
        } catch (error) {
            console.error('Ошибка при вступлении в группу:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Выйти из группы
    leaveGroup = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }

            // Проверяем, не является ли пользователь создателем группы
            const group = await this.groupService.getGroupById(Number(id));
            
            if (!group) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            if (group.creatorId === userId) {
                return res.status(400).json({ message: 'Создатель не может покинуть группу. Передайте права или удалите группу.' });
            }

            const success = await this.groupService.removeMember(Number(id), userId);
            
            if (!success) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            return res.status(200).json({ message: 'Вы успешно вышли из группы' });
        } catch (error) {
            console.error('Ошибка при выходе из группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Добавить администратора
    addAdmin = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { userId: targetUserId } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }

            const group = await this.groupService.getGroupById(Number(id));
            
            if (!group) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            // Проверяем права доступа (только создатель может добавлять админов)
            if (group.creatorId !== userId) {
                return res.status(403).json({ message: 'Нет прав на управление администраторами' });
            }

            const success = await this.groupService.addAdmin(Number(id), Number(targetUserId));
            
            if (!success) {
                return res.status(404).json({ message: 'Пользователь не найден' });
            }

            return res.status(200).json({ message: 'Администратор успешно добавлен' });
        } catch (error) {
            console.error('Ошибка при добавлении администратора:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Удалить администратора
    removeAdmin = async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { userId: targetUserId } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }

            const group = await this.groupService.getGroupById(Number(id));
            
            if (!group) {
                return res.status(404).json({ message: 'Группа не найдена' });
            }

            // Проверяем права доступа (только создатель может удалять админов)
            if (group.creatorId !== userId) {
                return res.status(403).json({ message: 'Нет прав на управление администраторами' });
            }

            const success = await this.groupService.removeAdmin(Number(id), Number(targetUserId));
            
            if (!success) {
                return res.status(404).json({ message: 'Администратор не найден' });
            }

            return res.status(200).json({ message: 'Администратор успешно удален' });
        } catch (error) {
            console.error('Ошибка при удалении администратора:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Получить посты группы
    getGroupPosts = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { limit = 10, offset = 0 } = req.query;
            
            const posts = await this.groupService.getGroupPosts(
                Number(id),
                Number(limit),
                Number(offset)
            );
            
            // Дополнительно загружаем информацию об альбомах для каждого поста
            for (const post of posts) {
                try {
                    // Загружаем альбомы напрямую через SQL-запрос, если они есть
                    const albumsQuery = await AppDataSource.query(`
                        SELECT a.* FROM albums a
                        JOIN post_album pa ON a.id = pa."albumId"
                        WHERE pa."postId" = $1
                    `, [post.id]);
                    
                    if (albumsQuery && albumsQuery.length > 0) {
                        // Загружаем фотографии для каждого альбома
                        for (const album of albumsQuery) {
                            const photosQuery = await AppDataSource.query(`
                                SELECT p.* FROM photos p
                                JOIN album_photos ap ON p.id = ap."photoId"
                                WHERE ap."albumId" = $1
                                LIMIT 5
                            `, [album.id]);
                            
                            album.photos = photosQuery || [];
                        }
                        
                        // Добавляем albums к посту
                        (post as any).albums = albumsQuery;
                    } else {
                        (post as any).albums = [];
                    }
                } catch (error) {
                    console.error(`Ошибка при загрузке альбомов для поста ${post.id}:`, error);
                    (post as any).albums = [];
                }
            }
            
            return res.json(posts);
        } catch (error) {
            console.error('Ошибка при получении постов группы:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Получить все группы
    getAllGroups = async (req: Request, res: Response) => {
        try {
            const { limit = 10, offset = 0 } = req.query;
            
            const [groups, total] = await this.groupService.getAllGroups(
                Number(limit),
                Number(offset)
            );
            
            return res.json({
                items: groups,
                total
            });
        } catch (error) {
            console.error('Ошибка при получении списка групп:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Получить группы пользователя
    getUserGroups = async (req: AuthRequest, res: Response) => {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ message: 'Не авторизован' });
            }

            const groups = await this.groupService.getUserGroups(userId);
            
            return res.json(groups);
        } catch (error) {
            console.error('Ошибка при получении групп пользователя:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Поиск групп
    searchGroups = async (req: Request, res: Response) => {
        try {
            const { query } = req.query;
            const { limit = 10, offset = 0 } = req.query;
            
            if (!query || typeof query !== 'string') {
                return res.status(400).json({ message: 'Введите поисковый запрос' });
            }

            const [groups, total] = await this.groupService.searchGroups(
                query,
                Number(limit),
                Number(offset)
            );
            
            return res.json({
                items: groups,
                total
            });
        } catch (error) {
            console.error('Ошибка при поиске групп:', error);
            return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
        }
    };

    // Вспомогательный метод для проверки прав администратора
    private isGroupAdmin = async (groupId: number, userId: number): Promise<boolean> => {
        const admins = await this.groupService.getGroupAdmins(groupId);
        return admins.some(admin => admin.id === userId);
    };
}