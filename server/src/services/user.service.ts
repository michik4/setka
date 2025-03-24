import { AppDataSource } from "../db/db_connect"
import { User } from "../entities/user.entity"
import { hash, genSalt } from "bcrypt"

export class UserService {
    private userRepository = AppDataSource.getRepository(User)

    async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
        console.log('Создание пользователя:', { email: userData.email });
        
        // Проверяем, не является ли пароль уже хешем bcrypt
        const isBcryptHash = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/.test(userData.password);
        
        let hashedPassword;
        if (isBcryptHash) {
            console.log('Пароль уже захеширован, пропускаем хеширование');
            hashedPassword = userData.password;
        } else {
            console.log('Хешируем пароль...');
            const salt = await genSalt(10);
            hashedPassword = await hash(userData.password, salt);
        }
        
        console.log('Длина пароля:', { 
            originalLength: userData.password.length,
            finalLength: hashedPassword.length 
        });
        
        const user = this.userRepository.create({
            ...userData,
            password: hashedPassword
        });
        
        const savedUser = await this.userRepository.save(user);
        console.log('Пользователь сохранен:', { 
            id: savedUser.id, 
            email: savedUser.email 
        });
        
        return savedUser;
    }

    async getUserByEmail(email: string) {
        return await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.email = :email', { email })
            .getOne();
    }

    async getUserByNickname(nickname: string) {
        return await this.userRepository.findOne({ where: { nickname } })
    }

    async getUserById(id: number) {
        return await this.userRepository
            .createQueryBuilder('user')
            .addSelect('user.password')
            .where('user.id = :id', { id })
            .getOne();
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
        const randomUser = {
            firstName: `User${randomNum}`,
            lastName: `LastName${randomNum}`,
            nickname: `user${randomNum}`,
            email: `user${randomNum}@example.com`,
            password: Math.random().toString(36).slice(-8),
            photos: [],
            posts: []
        }
        return await this.createUser(randomUser)
    }
 
} 