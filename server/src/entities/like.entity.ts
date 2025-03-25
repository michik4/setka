import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, Unique } from "typeorm";
import { User } from "./user.entity";
import { Post } from "./post.entity";
import { WallPost } from "./wall.entity";

@Entity("likes")
@Unique(["userId", "postId"]) // Один пользователь может поставить только один лайк посту
@Unique(["userId", "wallPostId"])
export class Like {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column({ nullable: true })
    postId: number;

    @Column({ nullable: true })
    wallPostId: number;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    user: User;

    @ManyToOne(() => Post, { onDelete: "CASCADE" })
    post: Post;

    @ManyToOne(() => WallPost, { onDelete: "CASCADE" })
    wallPost: WallPost;

    @CreateDateColumn()
    createdAt: Date;
} 