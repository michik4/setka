import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique, PrimaryColumn } from 'typeorm';
import { Post } from './post.entity';
import { Album } from './album.entity';

@Entity()
export class PostAlbum {
    @PrimaryColumn()
    postId: number;

    @PrimaryColumn()
    albumId: number;

    @ManyToOne(() => Post, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'postId', referencedColumnName: 'id' })
    post: Post;

    @ManyToOne(() => Album, album => album.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'albumId', referencedColumnName: 'id' })
    album: Album;
} 