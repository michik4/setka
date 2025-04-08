import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { Post } from './post.entity';
import { Album } from './album.entity';
import { WallPost } from './wall.entity';

@Entity()
@Unique(['postId', 'albumId'])
export class PostAlbum {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    postId: number;

    @Column()
    albumId: number;

    @ManyToOne(() => Post, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'postId', referencedColumnName: 'id' })
    post: Post;

    @ManyToOne(() => WallPost, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'postId', referencedColumnName: 'id' })
    wallPost: WallPost;

    @ManyToOne(() => Album, album => album.id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'albumId', referencedColumnName: 'id' })
    album: Album;
} 