import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    content: string;

    @ManyToOne(() => User, user => user.sentMessages)
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @Column({ name: 'sender_id' })
    senderId: number;

    @ManyToOne(() => Conversation, conversation => conversation.messages)
    @JoinColumn({ name: 'conversation_id' })
    conversation: Conversation;

    @Column({ name: 'conversation_id' })
    conversationId: number;

    @Column({ default: false })
    isRead: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
} 