import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, JoinColumn, OneToMany } from "typeorm";
import { User } from "./user.entity";
import { MusicTrack } from "./music.entity";
import { Group } from './group.entity';

@Entity("music_albums")
export class MusicAlbum {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ nullable: true })
    description: string;

    @Column()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user: User;

    @Column({ nullable: true })
    groupId: number;

    @ManyToOne(() => Group, { nullable: true })
    group: Group;

    @ManyToMany(() => MusicTrack)
    @JoinTable({
        name: "music_album_tracks",
        joinColumn: {
            name: "albumId",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "trackId",
            referencedColumnName: "id"
        }
    })
    tracks: MusicTrack[];

    @Column({ nullable: true })
    coverUrl: string;

    @Column({ default: false })
    isPrivate: boolean;
    
    @Column({ default: true })
    isInLibrary: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Виртуальное поле для количества треков
    tracksCount?: number;
} 