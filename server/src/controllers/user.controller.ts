import { Request, Response } from 'express'
import { UserService } from '../services/user.service'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { AuthRequest } from '../types/auth.types'
import { AuthenticatedRequest } from '../types/express'
import { upload } from '../utils/upload'
import { AppDataSource } from '../db/db_connect'
import { Photo } from '../entities/photo.entity'
import { User } from '../entities/user.entity'
import path from 'path'
import { Friend } from '../entities/friend.entity'
import { FriendRequest } from '../entities/friend-request.entity'

export class UserController {
    private photoRepository = AppDataSource.getRepository(Photo);

    constructor(private readonly userService: UserService) {}

    async createUser(req: Request, res: Response) {
        try {
            const user = await this.userService.createUser(req.body)
            res.status(201).json(user)
        } catch (error) {
            res.status(400).json({ message: 'Ошибка при создании пользователя', error })
        }
    }

    async getUsers(req: Request, res: Response) {
        try {
            const users = await this.userService.getAllUsers()
            res.json(users)
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при получении пользователей', error })
        }
    }

    async getUserByEmail(req: Request, res: Response) {
        try {
            const user = await this.userService.getUserByEmail(req.params.email)
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }
            res.json(user)
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при поиске пользователя', error })
        }
    }

    async getUserByNickname(req: Request, res: Response) {
        try {
            const user = await this.userService.getUserByNickname(req.params.nickname)
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }
            res.json(user)
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при поиске пользователя', error })
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const user = await this.userService.updateUser(parseInt(req.params.id), req.body)
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }
            res.json(user)
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при обновлении пользователя', error })
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            await this.userService.deleteUser(parseInt(req.params.id))
            res.status(204).send()
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при удалении пользователя', error })
        }
    }

    async createRandomUser(req: Request, res: Response) {
        try {
            const randomUser = await this.userService.createRandomUser()
            res.status(201).json(randomUser)
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при создании случайного пользователя', error })
        }
    }

    async getUserById(req: Request, res: Response) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Неверный формат ID' });
        }

        try {
            const user = await AppDataSource.getRepository(User)
                .createQueryBuilder('user')
                .leftJoinAndSelect('user.avatar', 'avatar')
                .where('user.id = :id', { id })
                .getOne();

            if (!user) {
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            // Если есть аутентифицированный пользователь, определяем статус дружбы
            const currentUserId = (req as AuthenticatedRequest).user?.id;
            let friendshipStatus = 'none';
            
            if (currentUserId) {
                friendshipStatus = await UserController.getFriendshipStatus(currentUserId, id);
            }

            // Добавляем статус дружбы к ответу
            const responseUser = {
                ...user,
                friendshipStatus
            };

            return res.json(responseUser);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: 'Ошибка сервера при получении пользователя' });
        }
    }

    async getUser(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id);
            
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Неверный формат идентификатора пользователя' });
            }

            const user = await this.userService.findUserWithAvatar(userId);
            
            // Если есть аутентифицированный пользователь, определяем статус дружбы
            const currentUserId = (req as AuthenticatedRequest).user?.id;
            let friendshipStatus = 'none';
            
            if (currentUserId) {
                friendshipStatus = await UserController.getFriendshipStatus(currentUserId, userId);
            }

            // Добавляем статус дружбы к ответу
            const responseUser = {
                ...user,
                friendshipStatus
            };

            res.json(responseUser);
        } catch (error) {
            if (error instanceof NotFoundException) {
                res.status(404).json({ message: error.message });
            } else if (error instanceof ForbiddenException) {
                res.status(403).json({ message: error.message });
            } else {
                console.error('Ошибка при получении пользователя:', error);
                res.status(500).json({ message: 'Ошибка при получении пользователя' });
            }
        }
    }

    async updateStatus(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params
            const { status } = req.body
            const userId = parseInt(id)

            // Проверяем, что пользователь обновляет свой собственный статус
            if (req.user && req.user.id !== userId) {
                throw new ForbiddenException('Вы можете обновлять только свой статус')
            }

            const user = await this.userService.updateStatus(userId, status)
            res.json(user)
        } catch (error) {
            if (error instanceof ForbiddenException) {
                res.status(403).json({ message: error.message })
            } else {
                res.status(500).json({ message: 'Ошибка при обновлении статуса', error })
            }
        }
    }

    async uploadAvatar(req: AuthenticatedRequest, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Файл не загружен' });
            }

            const userId = parseInt(req.params.id);
            
            // Проверяем, что пользователь меняет свой аватар
            if (req.user.id !== userId) {
                return res.status(403).json({ message: 'Нет прав для изменения аватара другого пользователя' });
            }

            // Создаем запись о фото
            const photo = this.photoRepository.create({
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size,
                path: req.file.filename, // Сохраняем только имя файла
                extension: path.extname(req.file.originalname),
                userId: userId
            });

            await this.photoRepository.save(photo);

            // Обновляем аватар пользователя
            await this.userService.updateAvatar(userId, photo.id);

            const updatedUser = await this.userService.findUserWithAvatar(userId);
            return res.json(updatedUser);
        } catch (error) {
            console.error('Ошибка при загрузке аватара:', error);
            return res.status(500).json({ message: 'Ошибка при загрузке аватара' });
        }
    }

    /**
     * Получить статус дружбы между текущим пользователем и запрашиваемым пользователем
     */
    private static async getFriendshipStatus(currentUserId: number, userId: number): Promise<string> {
        console.log(`getFriendshipStatus: Проверка статуса дружбы между ${currentUserId} и ${userId}`);
        
        // Если запрашивают текущего пользователя, возвращаем 'self'
        if (currentUserId === userId) {
            console.log(`getFriendshipStatus: currentUserId (${currentUserId}) === userId (${userId}), returning 'self'`);
            return 'self';
        }

        try {
            // Проверяем, являются ли пользователи друзьями с помощью QueryBuilder и явного SQL условия
            const friendshipQuery = AppDataSource.getRepository(Friend)
                .createQueryBuilder('friend')
                .where('(friend.userId = :currentUserId AND friend.friendId = :userId) OR (friend.userId = :userId AND friend.friendId = :currentUserId)', 
                    { currentUserId, userId });
            
            console.log('SQL запрос для проверки дружбы:', friendshipQuery.getSql(), { currentUserId, userId });
            
            const existingFriendship = await friendshipQuery.getOne();
            console.log(`getFriendshipStatus: Результат проверки дружбы:`, existingFriendship);

            if (existingFriendship) {
                console.log(`getFriendshipStatus: Пользователи ${currentUserId} и ${userId} являются друзьями`);
                return 'friends';
            }
            
            // Дополнительная проверка с помощью прямого SQL запроса
            const rawResult = await AppDataSource.query(
                `SELECT * FROM friends WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)`,
                [currentUserId, userId]
            );
            
            console.log('Результат прямого SQL запроса:', rawResult);
            
            if (rawResult && rawResult.length > 0) {
                console.log(`getFriendshipStatus: Прямой SQL запрос подтвердил, что пользователи ${currentUserId} и ${userId} являются друзьями`);
                return 'friends';
            }

            // Проверяем запросы в друзья
            const requestQuery = AppDataSource.getRepository(FriendRequest)
                .createQueryBuilder('request')
                .where('(request.senderId = :currentUserId AND request.receiverId = :userId) OR (request.senderId = :userId AND request.receiverId = :currentUserId)', 
                    { currentUserId, userId });
                    
            console.log('SQL запрос для проверки заявок в друзья:', requestQuery.getSql(), { currentUserId, userId });
            
            const existingRequest = await requestQuery.getOne();
            console.log(`getFriendshipStatus: Результат проверки заявок в друзья:`, existingRequest);

            if (existingRequest) {
                if (existingRequest.status === 'rejected') {
                    console.log(`getFriendshipStatus: Запрос на дружбу отклонен, возвращаем 'none'`);
                    return 'none';
                }
                
                if (existingRequest.senderId === currentUserId) {
                    console.log(`getFriendshipStatus: Запрос на дружбу отправлен от ${currentUserId} к ${userId}, возвращаем 'pending_sent'`);
                    return 'pending_sent';
                } else {
                    console.log(`getFriendshipStatus: Запрос на дружбу получен от ${userId} к ${currentUserId}, возвращаем 'pending_received'`);
                    return 'pending_received';
                }
            }

            console.log(`getFriendshipStatus: Нет дружбы или запросов между пользователями ${currentUserId} и ${userId}, возвращаем 'none'`);
            return 'none';
        } catch (error) {
            console.error('Ошибка при определении статуса дружбы:', error);
            return 'none';
        }
    }
} 