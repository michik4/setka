import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('friends')
export class Friend {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'friend_id' })
    friendId: number;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => User, user => user.friends)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => User, user => user.friendOf)
    @JoinColumn({ name: 'friend_id' })
    friend: User;
} 