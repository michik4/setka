import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('sessions')
export class Session {
    @PrimaryColumn()
    sessionId: string;

    @Column()
    userId: number;

    @Column({ nullable: true })
    deviceInfo: string;

    @Column()
    ipAddress: string;

    @Column()
    lastActivity: Date;

    @Column()
    expiresAt: Date;

    @Column({ default: true })
    isActive: boolean;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user: User;
} 