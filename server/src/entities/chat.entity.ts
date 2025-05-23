import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from "typeorm"
import { User } from "./user.entity"
import { Message } from "./message.entity"

// Устаревшая сущность. Вместо нее используйте Conversation
// @deprecated Используйте Conversation вместо Chat
@Entity('chats')
export class Chat {
    @PrimaryGeneratedColumn()
    id: number

    @Column({
        type: 'enum',
        enum: ['private', 'group'],
        default: 'private'
    })
    type: 'private' | 'group'

    @ManyToMany(() => User)
    @JoinTable({
        name: 'users_chats',
        joinColumn: { name: 'chat_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' }
    })
    participants: User[]

    // Закомментировано, т.к. в Message больше нет свойства chat
    // @OneToMany(() => Message, message => message.chat)
    messages: Message[]

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
} 