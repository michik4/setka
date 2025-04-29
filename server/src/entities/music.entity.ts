import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('music_tracks')
export class MusicTrack {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    title: string;

    @Column({ length: 255 })
    artist: string;

    @Column({ length: 255 })
    duration: string;

    @Column({ length: 255 })
    filename: string;

    @Column({ length: 255 })
    filepath: string;

    @Column({ length: 255, nullable: true })
    coverUrl: string;

    @Column({ type: 'int', default: 0 })
    playCount: number;

    @ManyToOne(() => User, (user) => user.id)
    user: User;

    @Column()
    userId: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
    
    // Виртуальное свойство для URL аудио файла
    audioUrl?: string;
} 