import { Request, Response } from 'express'
import { UserService } from '../services/user.service'
import { ForbiddenException, NotFoundException } from '@nestjs/common'
import { AuthRequest } from '../types/auth.types'
import { AuthenticatedRequest } from '../types/express'
import { upload } from '../utils/upload'
import { AppDataSource } from '../db/db_connect'
import { Photo } from '../entities/photo.entity'

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
        try {
            const { id } = req.params
            const user = await this.userService.getUserById(parseInt(id))
            if (!user) {
                return res.status(404).json({ message: 'Пользователь не найден' })
            }
            res.json(user)
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при получении пользователя', error })
        }
    }

    async getUser(req: Request, res: Response) {
        try {
            const userId = parseInt(req.params.id);
            
            if (isNaN(userId)) {
                return res.status(400).json({ message: 'Неверный формат идентификатора пользователя' });
            }

            const user = await this.userService.findUserWithAvatar(userId);
            res.json(user);
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
} 