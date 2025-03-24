import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm"
import { Photo } from "./photo.entity"
import { Post } from "./post.entity"

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

    @Column({ nullable: true })
    status: string

    @ManyToOne(() => Photo, { nullable: true })
    @JoinColumn({ name: 'avatarId' })
    avatar: Photo

    @Column({ nullable: true })
    avatarId: number

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @OneToMany(() => Photo, photo => photo.user)
    photos: Photo[]

    @OneToMany(() => Post, post => post.author)
    posts: Post[]
} 