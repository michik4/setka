import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, ManyToMany, JoinTable, JoinColumn } from "typeorm";
import { User } from "./user.entity";
import { Photo } from "./photo.entity";

@Entity("albums")
export class Album {
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

    @ManyToMany(() => Photo)
    @JoinTable({
        name: "album_photos",
        joinColumn: {
            name: "albumId",
            referencedColumnName: "id"
        },
        inverseJoinColumn: {
            name: "photoId",
            referencedColumnName: "id"
        }
    })
    photos: Photo[];

    @Column({ default: false })
    isPrivate: boolean;

    @Column({ default: 0 })
    photosCount: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 