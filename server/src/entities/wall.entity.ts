import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Photo } from './photo.entity';
import { Album } from './album.entity';
import { MusicTrack } from './music.entity';

@Entity('wall_posts')
export class WallPost {
    @PrimaryGeneratedColumn()
    id: number;

    @Column('text')
    content: string;

    @Column()
    authorId: number;

    @Column()
    wallOwnerId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'authorId' })
    author: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'wallOwnerId' })
    wallOwner: User;

    @ManyToMany(() => Photo)
    @JoinTable({
        name: "wall_posts_photos",
        joinColumn: {
            name: "wallPostId",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "photoId",
            referencedColumnName: "id"
        }
    })
    photos: Photo[];

    @ManyToMany(() => Album)
    @JoinTable({
        name: "post_album",
        joinColumn: {
            name: "postId", 
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "albumId",
            referencedColumnName: "id"
        }
    })
    albums: Album[];

    @ManyToMany(() => MusicTrack)
    @JoinTable({
        name: "wall_posts_tracks",
        joinColumn: {
            name: "wallPostId",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "trackId",
            referencedColumnName: "id"
        }
    })
    tracks: MusicTrack[];

    @Column("int", { default: 0 })
    likesCount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 