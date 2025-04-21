import { User } from "../entities/user.entity"
import { hash, genSalt } from "bcrypt"
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { Repository, DeepPartial } from 'typeorm'
import { Photo } from '../entities/photo.entity'
import { Post } from '../entities/post.entity'
import { AppDataSource } from '../db/db_connect'

@Injectable()
export class UserService {
    private userRepository: Repository<User>;
    private photoRepository: Repository<Photo>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(User);
        this.photoRepository = AppDataSource.getRepository(Photo);
    }

    async createUser(userData: DeepPartial<User>) {
        console.log('Создание пользователя:', { email: userData.email })
        
        if (userData.password) {
            // Проверяем, не является ли пароль уже хешем bcrypt
            const isBcryptHash = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(userData.password)
            
            if (!isBcryptHash) {
                console.log('Хешируем пароль...')
                const salt = await genSalt(10)
                userData.password = await hash(userData.password, salt)
            } else {
                console.log('Пароль уже захеширован, пропускаем хеширование')
            }
            
            console.log('Длина пароля:', { 
                originalLength: userData.password.length,
                finalLength: userData.password.length 
            })
        }
        
        const user = this.userRepository.create(userData)
        const savedUser = await this.userRepository.save(user)
        
        console.log('Пользователь сохранен:', { 
            id: savedUser.id, 
            email: savedUser.email 
        })
        
        return savedUser
    }

    async getUserByEmail(email: string) {
        return await this.userRepository
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.nickname',
                'user.email',
                'user.password',
                'user.createdAt',
                'user.updatedAt'
            ])
            .where('user.email = :email', { email })
            .getOne()
    }

    async getUserByNickname(nickname: string) {
        return await this.userRepository.findOne({ where: { nickname } })
    }

    async getUserById(id: number) {
        return await this.userRepository
            .createQueryBuilder('user')
            .select([
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.email',
                'user.nickname',
                'user.createdAt',
                'user.updatedAt'
            ])
            .where('user.id = :id', { id })
            .getOne()
    }

    async getAllUsers() {
        return await this.userRepository.find()
    }

    async updateUser(id: number, userData: Partial<User>) {
        if (userData.password) {
            userData.password = await hash(userData.password, 10)
        }
        await this.userRepository.update(id, userData)
        return await this.userRepository.findOne({ where: { id } })
    }

    async deleteUser(id: number) {
        await this.userRepository.delete(id)
    }

    async createRandomUser() {
        const randomNum = Math.floor(Math.random() * 1000)
        const randomUser: DeepPartial<User> = {
            firstName: `User${randomNum}`,
            lastName: `LastName${randomNum}`,
            nickname: `user${randomNum}`,
            email: `user${randomNum}@example.com`,
            password: Math.random().toString(36).slice(-8),
            status: 'Привет, я новый пользователь!'
        }
        return await this.createUser(randomUser)
    }

    async findUserWithAvatar(userId: number): Promise<User> {
        const user = await this.userRepository
            .createQueryBuilder('user')
            .leftJoinAndSelect('user.avatar', 'avatar')
            .select([
                'user.id',
                'user.firstName',
                'user.lastName',
                'user.nickname',
                'user.email',
                'user.status',
                'user.avatarId',
                'user.createdAt',
                'user.updatedAt',
                'avatar.id',
                'avatar.filename',
                'avatar.path'
            ])
            .where('user.id = :userId', { userId })
            .getOne();

        if (!user) {
            throw new NotFoundException('Пользователь не найден');
        }

        return user;
    }

    async updateStatus(userId: number, status: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId }
        })

        if (!user) {
            throw new NotFoundException('Пользователь не найден')
        }

        user.status = status
        return this.userRepository.save(user)
    }

    async updateAvatar(userId: number, photoId: number): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('Пользователь не найден');
        }

        user.avatarId = photoId;
        return await this.userRepository.save(user);
    }
} 