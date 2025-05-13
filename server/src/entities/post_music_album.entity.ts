import { Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Post } from "./post.entity";
import { MusicAlbum } from "./music_album.entity";

@Entity("post_music_albums")
export class PostMusicAlbum {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Post, post => post.musicAlbumRelations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "postId" })
    post: Post;

    @ManyToOne(() => MusicAlbum, { onDelete: 'CASCADE' })
    @JoinColumn({ name: "musicAlbumId" })
    musicAlbum: MusicAlbum;

    @CreateDateColumn()
    createdAt: Date;
} 