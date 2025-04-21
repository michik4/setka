import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn, ManyToMany, JoinTable } from "typeorm"
import { Photo } from "./photo.entity"
import { Post } from "./post.entity"
import { User } from "./user.entity"

@Entity('groups')
export class Group {
    @PrimaryGeneratedColumn()
    id: number

    @Column({ length: 100 })
    name: string

    @Column({ length: 50, unique: true })
    slug: string

    @Column({ type: 'text', nullable: true })
    description: string

    @ManyToOne(() => User)
    @JoinColumn({ name: 'creatorId' })
    creator: User

    @Column()
    creatorId: number

    @ManyToOne(() => Photo, { nullable: true })
    @JoinColumn({ name: 'avatarId' })
    avatar: Photo

    @Column({ nullable: true })
    avatarId: number

    @ManyToOne(() => Photo, { nullable: true })
    @JoinColumn({ name: 'coverId' })
    cover: Photo

    @Column({ nullable: true })
    coverId: number

    @ManyToMany(() => User)
    @JoinTable({
        name: 'group_members',
        joinColumn: { name: 'groupId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
    })
    members: User[]

    @ManyToMany(() => User)
    @JoinTable({
        name: 'group_admins',
        joinColumn: { name: 'groupId', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
    })
    admins: User[]

    @OneToMany(() => Post, post => post.group)
    posts: Post[]

    @Column({ default: false })
    isPrivate: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date
} 