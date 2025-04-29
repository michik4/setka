import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, ManyToMany } from "typeorm"
import { Photo } from "./photo.entity"
import { Post } from "./post.entity"
import { MusicTrack } from "./music.entity"
import { FriendRequest } from "./friend-request.entity"
import { Friend } from "./friend.entity"
import { Message } from "./message.entity"
import { Conversation } from "./conversation.entity"

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

    @OneToMany(() => MusicTrack, track => track.user)
    musicTracks: MusicTrack[]

    // Связи для друзей
    @OneToMany(() => FriendRequest, request => request.sender)
    sentFriendRequests: FriendRequest[]

    @OneToMany(() => FriendRequest, request => request.receiver)
    receivedFriendRequests: FriendRequest[]

    @OneToMany(() => Friend, friend => friend.user)
    friends: Friend[]

    @OneToMany(() => Friend, friend => friend.friend)
    friendOf: Friend[]

    // Связи для мессенджера
    @OneToMany(() => Message, message => message.sender)
    sentMessages: Message[]

    @ManyToMany(() => Conversation, conversation => conversation.participants)
    conversations: Conversation[]
} 