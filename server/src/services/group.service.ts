import { AppDataSource } from '../db/db_connect';
import { Group } from '../entities/group.entity';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { Photo } from '../entities/photo.entity';
import { In } from 'typeorm';

export class GroupService {
    private groupRepository = AppDataSource.getRepository(Group);
    private userRepository = AppDataSource.getRepository(User);
    private postRepository = AppDataSource.getRepository(Post);
    private photoRepository = AppDataSource.getRepository(Photo);

    async createGroup(groupData: {
        name: string;
        slug: string;
        description?: string;
        creatorId: number;
        avatarId?: number;
        coverId?: number;
        isPrivate?: boolean;
    }): Promise<Group> {
        const newGroup = this.groupRepository.create(groupData);
        await this.groupRepository.save(newGroup);

        // Добавляем создателя как участника и администратора
        const creator = await this.userRepository.findOneBy({ id: groupData.creatorId });
        if (creator) {
            newGroup.members = [creator];
            newGroup.admins = [creator];
            await this.groupRepository.save(newGroup);
        }

        return newGroup;
    }

    async getGroupById(id: number): Promise<Group | null> {
        return this.groupRepository.findOne({
            where: { id },
            relations: ['creator', 'avatar', 'cover']
        });
    }

    async getGroupBySlug(slug: string): Promise<Group | null> {
        return this.groupRepository.findOne({
            where: { slug },
            relations: ['creator', 'avatar', 'cover']
        });
    }

    async updateGroup(id: number, groupData: Partial<Group>): Promise<Group | null> {
        await this.groupRepository.update(id, groupData);
        return this.getGroupById(id);
    }

    async deleteGroup(id: number): Promise<boolean> {
        const result = await this.groupRepository.delete(id);
        return result.affected !== 0;
    }

    async getGroupMembers(groupId: number): Promise<User[]> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members']
        });
        return group?.members || [];
    }

    async getGroupAdmins(groupId: number): Promise<User[]> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['admins']
        });
        return group?.admins || [];
    }

    async addMember(groupId: number, userId: number): Promise<boolean> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members']
        });
        
        if (!group) return false;
        
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) return false;
        
        if (!group.members) group.members = [];
        
        // Проверяем, что пользователь еще не является участником
        if (group.members.some((member: User) => member.id === userId)) {
            return true; // Уже участник
        }
        
        group.members.push(user);
        await this.groupRepository.save(group);
        return true;
    }

    async removeMember(groupId: number, userId: number): Promise<boolean> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members', 'admins']
        });
        
        if (!group) return false;
        
        // Удаляем из участников
        if (group.members) {
            group.members = group.members.filter((member: User) => member.id !== userId);
        }
        
        // Удаляем из администраторов, если он там был
        if (group.admins) {
            group.admins = group.admins.filter((admin: User) => admin.id !== userId);
        }
        
        await this.groupRepository.save(group);
        return true;
    }

    async addAdmin(groupId: number, userId: number): Promise<boolean> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['admins', 'members']
        });
        
        if (!group) return false;
        
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) return false;
        
        // Проверяем, что пользователь является участником
        if (!group.members || !group.members.some((member: User) => member.id === userId)) {
            // Если не участник, сначала добавляем его в участники
            if (!group.members) group.members = [];
            group.members.push(user);
        }
        
        if (!group.admins) group.admins = [];
        
        // Проверяем, что пользователь еще не является администратором
        if (group.admins.some((admin: User) => admin.id === userId)) {
            return true; // Уже администратор
        }
        
        group.admins.push(user);
        await this.groupRepository.save(group);
        return true;
    }

    async removeAdmin(groupId: number, userId: number): Promise<boolean> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['admins']
        });
        
        if (!group || !group.admins) return false;
        
        // Удаляем из администраторов
        group.admins = group.admins.filter((admin: User) => admin.id !== userId);
        
        await this.groupRepository.save(group);
        return true;
    }

    async getGroupPosts(groupId: number, limit: number = 10, offset: number = 0): Promise<Post[]> {
        // Получаем посты группы с основными связями
        const posts = await this.postRepository.find({
            where: { groupId },
            relations: [
                'author', 
                'author.avatar', 
                'photos', 
                'tracks',
                'group'
            ],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset
        });

        // Обрабатываем треки для каждого поста, добавляя audioUrl
        for (const post of posts) {
            if (post.tracks && post.tracks.length > 0) {
                post.tracks = post.tracks.map(track => ({
                    ...track,
                    audioUrl: `/api/music/file/${track.filename}`
                } as any));
            }
        }

        return posts;
    }

    async getAllGroups(limit: number = 10, offset: number = 0): Promise<[Group[], number]> {
        return this.groupRepository.findAndCount({
            relations: ['creator', 'avatar'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset
        });
    }

    async getUserGroups(userId: number): Promise<Group[]> {
        // Проверяем существование пользователя
        const userExists = await this.userRepository.findOne({
            where: { id: userId }
        });
        
        if (!userExists) return [];
        
        // Получаем группы, в которых пользователь является участником через связь ManyToMany
        return this.groupRepository.createQueryBuilder('group')
            .innerJoinAndSelect('group.members', 'member', 'member.id = :userId', { userId })
            .leftJoinAndSelect('group.creator', 'creator')
            .leftJoinAndSelect('group.avatar', 'avatar')
            .orderBy('group.createdAt', 'DESC')
            .getMany();
    }

    async searchGroups(query: string, limit: number = 10, offset: number = 0): Promise<[Group[], number]> {
        return this.groupRepository.findAndCount({
            where: [
                { name: new RegExp(query, 'i').toString() },
                { slug: new RegExp(query, 'i').toString() }
            ],
            relations: ['creator', 'avatar'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset
        });
    }
} 