"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const bcrypt_1 = require("bcrypt");
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let UserService = class UserService {
    constructor(userRepository, photoRepository) {
        this.userRepository = userRepository;
        this.photoRepository = photoRepository;
    }
    async createUser(userData) {
        console.log('Создание пользователя:', { email: userData.email });
        if (userData.password) {
            // Проверяем, не является ли пароль уже хешем bcrypt
            const isBcryptHash = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(userData.password);
            if (!isBcryptHash) {
                console.log('Хешируем пароль...');
                const salt = await (0, bcrypt_1.genSalt)(10);
                userData.password = await (0, bcrypt_1.hash)(userData.password, salt);
            }
            else {
                console.log('Пароль уже захеширован, пропускаем хеширование');
            }
            console.log('Длина пароля:', {
                originalLength: userData.password.length,
                finalLength: userData.password.length
            });
        }
        const user = this.userRepository.create(userData);
        const savedUser = await this.userRepository.save(user);
        console.log('Пользователь сохранен:', {
            id: savedUser.id,
            email: savedUser.email
        });
        return savedUser;
    }
    async getUserByEmail(email) {
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
            .getOne();
    }
    async getUserByNickname(nickname) {
        return await this.userRepository.findOne({ where: { nickname } });
    }
    async getUserById(id) {
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
            .getOne();
    }
    async getAllUsers() {
        return await this.userRepository.find();
    }
    async updateUser(id, userData) {
        if (userData.password) {
            userData.password = await (0, bcrypt_1.hash)(userData.password, 10);
        }
        await this.userRepository.update(id, userData);
        return await this.userRepository.findOne({ where: { id } });
    }
    async deleteUser(id) {
        await this.userRepository.delete(id);
    }
    async createRandomUser() {
        const randomNum = Math.floor(Math.random() * 1000);
        const randomUser = {
            firstName: `User${randomNum}`,
            lastName: `LastName${randomNum}`,
            nickname: `user${randomNum}`,
            email: `user${randomNum}@example.com`,
            password: Math.random().toString(36).slice(-8),
            status: 'Привет, я новый пользователь!'
        };
        return await this.createUser(randomUser);
    }
    async findUserWithAvatar(userId) {
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
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        return user;
    }
    async updateStatus(userId, status) {
        const user = await this.userRepository.findOne({
            where: { id: userId }
        });
        if (!user) {
            throw new common_1.NotFoundException('Пользователь не найден');
        }
        user.status = status;
        return this.userRepository.save(user);
    }
    async updateAvatar(userId, photoId) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new Error('Пользователь не найден');
        }
        user.avatarId = photoId;
        return await this.userRepository.save(user);
    }
};
exports.UserService = UserService;
exports.UserService = UserService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.Repository,
        typeorm_1.Repository])
], UserService);
