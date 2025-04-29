import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('friends_requests')
export class FriendRequest {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'sender_id' })
    senderId: number;

    @Column({ name: 'receiver_id' })
    receiverId: number;

    @Column({ 
        type: 'varchar', 
        default: 'pending', 
        enum: ['pending', 'accepted', 'rejected'] 
    })
    status: 'pending' | 'accepted' | 'rejected';

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @ManyToOne(() => User, user => user.sentFriendRequests)
    @JoinColumn({ name: 'sender_id' })
    sender: User;

    @ManyToOne(() => User, user => user.receivedFriendRequests)
    @JoinColumn({ name: 'receiver_id' })
    receiver: User;
} 