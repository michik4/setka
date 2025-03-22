import { Request, Response } from 'express'
import { UserService } from '../services/user.service'

export class UserController {
    private userService = new UserService()

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
            const user = await this.userService.createUser(randomUser)
            res.status(201).json(user)
        } catch (error) {
            res.status(500).json({ message: 'Ошибка при создании случайного пользователя', error })
        }
    }
} 