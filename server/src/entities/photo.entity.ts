import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./user.entity";

@Entity("photos")
export class Photo {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    filename: string;

    @Column()
    originalName: string;

    @Column()
    mimetype: string;

    @Column()
    size: number;

    @Column()
    path: string;

    @Column()
    extension: string;

    @Column({ default: false })
    isDeleted: boolean;

    @Column({ nullable: true })
    description?: string;

    @Column({ nullable: true })
    width?: number;

    @Column({ nullable: true })
    height?: number;

    @Column()
    userId: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "userId" })
    user: User;

    @CreateDateColumn()
    createdAt: Date;
} 