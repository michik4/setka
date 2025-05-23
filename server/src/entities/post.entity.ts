import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { User } from "./user.entity";
import { Photo } from "./photo.entity";
import { MusicTrack } from "./music.entity";
import { Group } from "./group.entity";
import { Album } from "./album.entity";
import { PostAlbum } from "./post_album.entity";
import { PostMusicAlbum } from "./post_music_album.entity";
import { MusicAlbum } from "./music_album.entity";

@Entity("posts")
export class Post {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    content: string;

    @ManyToOne(() => User, user => user.posts)
    author: User;

    @Column()
    authorId: number;

    @ManyToOne(() => Group, group => group.posts, { nullable: true })
    group: Group;

    @Column({ nullable: true })
    groupId: number;

    @Column({ nullable: true })
    wallOwnerId: number;

    @ManyToOne(() => User, { nullable: true })
    wallOwner: User;

    @ManyToMany(() => Photo)
    @JoinTable({
        name: "posts_photos",
        joinColumn: {
            name: "postId",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "photoId",
            referencedColumnName: "id"
        }
    })
    photos: Photo[];

    @OneToMany(() => PostAlbum, postAlbum => postAlbum.post)
    albumRelations: PostAlbum[];

    @OneToMany(() => PostMusicAlbum, postMusicAlbum => postMusicAlbum.post)
    musicAlbumRelations: PostMusicAlbum[];

    @ManyToMany(() => MusicTrack)
    @JoinTable({
        name: "posts_tracks",
        joinColumn: {
            name: "postId",
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

    @Column("int", { default: 0 })
    commentsCount: number;

    @Column("int", { default: 0 })
    sharesCount: number;

    @Column("int", { default: 0 })
    viewsCount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Нереляционное свойство для альбомов
    albums?: Album[];

    // Нереляционное свойство для музыкальных альбомов
    musicAlbums?: MusicAlbum[];
} 