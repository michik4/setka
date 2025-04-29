import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, OneToMany } from "typeorm";
import { User } from "./user.entity";
import { Post } from "./post.entity";

@Entity("comments")
export class Comment {
    @PrimaryGeneratedColumn()
    id: number;

    @Column("text")
    content: string;

    @Column()
    postId: number;

    @Column()
    authorId: number;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'authorId' })
    author: User;

    @ManyToOne(() => Post, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'postId' })
    post: Post;

    @Column({ nullable: true })
    parentId: number;

    @ManyToOne(() => Comment, comment => comment.replies, { onDelete: "CASCADE", nullable: true })
    @JoinColumn({ name: 'parentId' })
    parent: Comment;

    @OneToMany(() => Comment, comment => comment.parent)
    replies: Comment[];

    @CreateDateColumn()
    createdAt: Date;
} 