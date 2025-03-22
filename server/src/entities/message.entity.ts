import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from "typeorm"
import { User } from "./user.entity"
import { Chat } from "./chat.entity"

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn()
    id: number

    @Column('text')
    content: string

    @ManyToOne(() => User)
    sender: User

    @ManyToOne(() => Chat, chat => chat.messages)
    chat: Chat

    @CreateDateColumn()
    createdAt: Date
} 