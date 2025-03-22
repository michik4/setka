import { AppDataSource } from "../db/db_connect"
import { User } from "../entities/user.entity"
import { hash } from "bcrypt"

export class UserService {
    private userRepository = AppDataSource.getRepository(User)

    async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) {
        const hashedPassword = await hash(userData.password, 10)
        const user = this.userRepository.create({
            ...userData,
            password: hashedPassword
        })
        return await this.userRepository.save(user)
    }

    async getUserByEmail(email: string) {
        return await this.userRepository.findOne({ where: { email } })
    }

    async getUserById(id: number) {
        return await this.userRepository.findOne({ where: { id } })
    }

    async getAllUsers() {
        return await this.userRepository.find()
    }

    async updateUser(id: number, userData: Partial<User>) {
        await this.userRepository.update(id, userData)
        return await this.userRepository.findOne({ where: { id } })
    }

    async deleteUser(id: number) {
        await this.userRepository.delete(id)
    }

    async createRandomUser() {
        const randomUser = {
            firstName: `User${Math.floor(Math.random() * 1000)}`,
            lastName: `LastName${Math.floor(Math.random() * 1000)}`,
            email: `user${Math.floor(Math.random() * 1000)}@example.com`,
            password: Math.random().toString(36).slice(-8)  
        }
        return await this.createUser(randomUser)
    }
 
} 