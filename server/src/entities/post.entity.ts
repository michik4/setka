import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, OneToMany } from "typeorm";
import { User } from "./user.entity";
import { Photo } from "./photo.entity";
import { WallPost } from "./wall.entity";

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

    @OneToMany(() => WallPost, wallPost => wallPost.author)
    wallPosts: WallPost[];

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
} 