import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from "typeorm"
import { User } from "./user.entity"
import { Message } from "./message.entity"

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

    @OneToMany(() => Message, message => message.chat)
    messages: Message[]

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
} 