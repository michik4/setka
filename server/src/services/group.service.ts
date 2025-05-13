import { AppDataSource } from '../db/db_connect';
import { Group } from '../entities/group.entity';
import { User } from '../entities/user.entity';
import { Post } from '../entities/post.entity';
import { Photo } from '../entities/photo.entity';
import { In } from 'typeorm';
import { PostMusicAlbum } from '../entities/post_music_album.entity';

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
        const group = await this.groupRepository.findOne({
            where: { id },
            relations: ['creator', 'avatar', 'cover']
        });
        
        if (group) {
            // Получаем количество участников
            const membersCount = await AppDataSource
                .createQueryBuilder()
                .select('COUNT(gm.userId)', 'count')
                .from('group_members', 'gm')
                .where('gm.groupId = :groupId', { groupId: group.id })
                .getRawOne()
                .then(result => parseInt(result.count, 10) || 0);
            
            // Получаем количество постов
            const postsCount = await this.postRepository
                .createQueryBuilder('post')
                .where('post.groupId = :groupId', { groupId: group.id })
                .getCount();
            
            // Устанавливаем значения
            group.membersCount = membersCount;
            group.postsCount = postsCount;
        }
        
        return group;
    }

    async getGroupBySlug(slug: string): Promise<Group | null> {
        const group = await this.groupRepository.findOne({
            where: { slug },
            relations: ['creator', 'avatar', 'cover']
        });
        
        if (group) {
            // Получаем количество участников
            const membersCount = await AppDataSource
                .createQueryBuilder()
                .select('COUNT(gm.userId)', 'count')
                .from('group_members', 'gm')
                .where('gm.groupId = :groupId', { groupId: group.id })
                .getRawOne()
                .then(result => parseInt(result.count, 10) || 0);
            
            // Получаем количество постов
            const postsCount = await this.postRepository
                .createQueryBuilder('post')
                .where('post.groupId = :groupId', { groupId: group.id })
                .getCount();
            
            // Устанавливаем значения
            group.membersCount = membersCount;
            group.postsCount = postsCount;
        }
        
        return group;
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
        try {
            // Вернемся к более простому запросу, но добавим связь с аватарами
            const group = await this.groupRepository.findOne({
                where: { id: groupId },
                relations: ['members', 'members.avatar']
            });
            
            const members = group?.members || [];
            console.log('Загружено участников группы:', members.length);
            console.log('С аватарами:', members.filter(m => m.avatar).length);
            
            return members;
        } catch (error) {
            console.error('Ошибка при загрузке участников группы:', error);
            return [];
        }
    }

    async getGroupAdmins(groupId: number): Promise<User[]> {
        try {
            // Вернемся к более простому запросу, но добавим связь с аватарами
            const group = await this.groupRepository.findOne({
                where: { id: groupId },
                relations: ['admins', 'admins.avatar']
            });
            
            const admins = group?.admins || [];
            console.log('Загружено администраторов группы:', admins.length);
            console.log('С аватарами:', admins.filter(a => a.avatar).length);
            
            return admins;
        } catch (error) {
            console.error('Ошибка при загрузке администраторов группы:', error);
            return [];
        }
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
        
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) return false;
        
        group.admins = group.admins.filter((admin: User) => admin.id !== userId);
        await this.groupRepository.save(group);
        
        return true;
    }

    async banMember(groupId: number, userId: number): Promise<boolean> {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members', 'admins', 'bannedUsers']
        });
        
        if (!group) return false;
        
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) return false;
        
        // Проверяем, что пользователь является участником
        const isMember = group.members && group.members.some((member: User) => member.id === userId);
        
        // Если пользователь участник, удаляем его из участников
        if (isMember) {
            group.members = group.members.filter((member: User) => member.id !== userId);
        }
        
        // Если пользователь админ, удаляем его из админов
        if (group.admins) {
            group.admins = group.admins.filter((admin: User) => admin.id !== userId);
        }
        
        // Добавляем пользователя в список забаненных
        if (!group.bannedUsers) {
            group.bannedUsers = [];
        }
        
        // Проверяем, не забанен ли пользователь уже
        const isBanned = group.bannedUsers.some((bannedUser: User) => bannedUser.id === userId);
        
        if (!isBanned) {
            group.bannedUsers.push(user);
        }
        
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

        // Для каждого поста загружаем музыкальные альбомы и обрабатываем треки
        for (const post of posts) {
            // Загружаем музыкальные альбомы для поста
            const postMusicAlbums = await AppDataSource.getRepository(PostMusicAlbum)
                .createQueryBuilder('postMusicAlbum')
                .leftJoinAndSelect('postMusicAlbum.musicAlbum', 'musicAlbum')
                .leftJoinAndSelect('musicAlbum.tracks', 'tracks')
                .where('postMusicAlbum.postId = :postId', { postId: post.id })
                .getMany();
            
            // Извлекаем музыкальные альбомы из связующей таблицы
            const musicAlbums = postMusicAlbums.map(pma => {
                const musicAlbum = pma.musicAlbum;
                // Добавляем количество треков
                musicAlbum.tracksCount = musicAlbum.tracks?.length || 0;
                return musicAlbum;
            });
            
            // Добавляем музыкальные альбомы к посту
            post.musicAlbums = musicAlbums;
            
            // Добавляем audioUrl к каждому треку
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
        const [groups, count] = await this.groupRepository.findAndCount({
            relations: ['creator', 'avatar'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset
        });
        
        // Для каждой группы подсчитываем количество участников и администраторов
        for (const group of groups) {
            // Получаем количество участников
            const membersCount = await AppDataSource
                .createQueryBuilder()
                .select('COUNT(gm.userId)', 'count')
                .from('group_members', 'gm')
                .where('gm.groupId = :groupId', { groupId: group.id })
                .getRawOne()
                .then(result => parseInt(result.count, 10) || 0);
            
            // Получаем количество постов
            const postsCount = await this.postRepository
                .createQueryBuilder('post')
                .where('post.groupId = :groupId', { groupId: group.id })
                .getCount();
            
            // Устанавливаем значения
            group.membersCount = membersCount;
            group.postsCount = postsCount;
        }
        
        return [groups, count];
    }

    async getUserGroups(userId: number): Promise<Group[]> {
        // Проверяем существование пользователя
        const userExists = await this.userRepository.findOne({
            where: { id: userId }
        });
        
        if (!userExists) return [];
        
        // Получаем группы, в которых пользователь является участником через связь ManyToMany
        const groups = await this.groupRepository.createQueryBuilder('group')
            .innerJoinAndSelect('group.members', 'member', 'member.id = :userId', { userId })
            .leftJoinAndSelect('group.creator', 'creator')
            .leftJoinAndSelect('group.avatar', 'avatar')
            .orderBy('group.createdAt', 'DESC')
            .getMany();
            
        // Для каждой группы подсчитываем количество участников и постов
        for (const group of groups) {
            // Получаем количество участников
            const membersCount = await AppDataSource
                .createQueryBuilder()
                .select('COUNT(gm.userId)', 'count')
                .from('group_members', 'gm')
                .where('gm.groupId = :groupId', { groupId: group.id })
                .getRawOne()
                .then(result => parseInt(result.count, 10) || 0);
            
            // Получаем количество постов
            const postsCount = await this.postRepository
                .createQueryBuilder('post')
                .where('post.groupId = :groupId', { groupId: group.id })
                .getCount();
            
            // Устанавливаем значения
            group.membersCount = membersCount;
            group.postsCount = postsCount;
        }
        
        return groups;
    }

    async getUserAdminGroups(userId: number): Promise<Group[]> {
        // Проверяем существование пользователя
        const userExists = await this.userRepository.findOne({
            where: { id: userId }
        });
        
        if (!userExists) return [];
        
        // Получаем группы, в которых пользователь является администратором
        const groups = await this.groupRepository.createQueryBuilder('group')
            .innerJoinAndSelect('group.admins', 'admin', 'admin.id = :userId', { userId })
            .leftJoinAndSelect('group.creator', 'creator')
            .leftJoinAndSelect('group.avatar', 'avatar')
            .orderBy('group.createdAt', 'DESC')
            .getMany();
            
        // Для каждой группы подсчитываем количество участников и постов
        for (const group of groups) {
            // Получаем количество участников
            const membersCount = await AppDataSource
                .createQueryBuilder()
                .select('COUNT(gm.userId)', 'count')
                .from('group_members', 'gm')
                .where('gm.groupId = :groupId', { groupId: group.id })
                .getRawOne()
                .then(result => parseInt(result.count, 10) || 0);
            
            // Получаем количество постов
            const postsCount = await this.postRepository
                .createQueryBuilder('post')
                .where('post.groupId = :groupId', { groupId: group.id })
                .getCount();
            
            // Устанавливаем значения
            group.membersCount = membersCount;
            group.postsCount = postsCount;
        }
        
        return groups;
    }

    async searchGroups(query: string, limit: number = 10, offset: number = 0): Promise<[Group[], number]> {
        const [groups, count] = await this.groupRepository.findAndCount({
            where: [
                { name: new RegExp(query, 'i').toString() },
                { slug: new RegExp(query, 'i').toString() }
            ],
            relations: ['creator', 'avatar'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset
        });
        
        // Для каждой группы подсчитываем количество участников и постов
        for (const group of groups) {
            // Получаем количество участников
            const membersCount = await AppDataSource
                .createQueryBuilder()
                .select('COUNT(gm.userId)', 'count')
                .from('group_members', 'gm')
                .where('gm.groupId = :groupId', { groupId: group.id })
                .getRawOne()
                .then(result => parseInt(result.count, 10) || 0);
            
            // Получаем количество постов
            const postsCount = await this.postRepository
                .createQueryBuilder('post')
                .where('post.groupId = :groupId', { groupId: group.id })
                .getCount();
            
            // Устанавливаем значения
            group.membersCount = membersCount;
            group.postsCount = postsCount;
        }
        
        return [groups, count];
    }

    // Добавляем методы для работы с музыкальными альбомами группы
    async getGroupMusicAlbums(groupId: number, limit: number = 20, offset: number = 0) {
        try {
            // Получаем музыкальные альбомы из базы данных
            const musicAlbums = await AppDataSource.getRepository('music_albums')
                .createQueryBuilder('album')
                .where('album.groupId = :groupId', { groupId })
                .leftJoinAndSelect('album.tracks', 'track')
                .orderBy('album.createdAt', 'DESC')
                .take(limit)
                .skip(offset)
                .getMany();
            
            return musicAlbums.map(album => {
                // Добавляем количество треков
                album.tracksCount = album.tracks ? album.tracks.length : 0;
                return album;
            });
        } catch (error) {
            console.error('Ошибка при получении музыкальных альбомов группы:', error);
            return [];
        }
    }

    async getGroupMusicAlbumsCount(groupId: number): Promise<number> {
        try {
            // Получаем количество музыкальных альбомов группы
            const count = await AppDataSource.getRepository('music_albums')
                .createQueryBuilder('album')
                .where('album.groupId = :groupId', { groupId })
                .getCount();
            
            return count;
        } catch (error) {
            console.error('Ошибка при получении количества музыкальных альбомов группы:', error);
            return 0;
        }
    }
} 