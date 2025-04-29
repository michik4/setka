import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";
import { Group } from "./group.entity";

@Entity("group_members")
export class GroupMember {
    @PrimaryGeneratedColumn({ name: "id" })
    id: number;

    @Column({ name: "userId" })
    userId: number;

    @Column({ name: "groupId" })
    groupId: number;

    @ManyToOne(() => User, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Group, { onDelete: "CASCADE" })
    @JoinColumn({ name: 'groupId' })
    group: Group;

    @Column({ name: "isAdmin", default: false })
    isAdmin: boolean;

    @Column({ name: "isCreator", default: false })
    isCreator: boolean;

    @CreateDateColumn({ name: "createdAt" })
    createdAt: Date;

    @UpdateDateColumn({ name: "updatedAt" })
    updatedAt: Date;
} 