import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity('users')
export class User {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ length: 100 })
    firstName: string

    @Column({ length: 100 })
    lastName: string

    @Column({ length: 50, unique: true, nullable: true }) // Временно делаем nullable
    nickname: string

    @Column({ unique: true })
    email: string

    @Column({ select: false }) // Пароль не будет выбираться по умолчанию
    password: string

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
} 