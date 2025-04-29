"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
const db_connect_1 = require("../db/db_connect");
const group_entity_1 = require("../entities/group.entity");
const user_entity_1 = require("../entities/user.entity");
const post_entity_1 = require("../entities/post.entity");
const photo_entity_1 = require("../entities/photo.entity");
class GroupService {
    constructor() {
        this.groupRepository = db_connect_1.AppDataSource.getRepository(group_entity_1.Group);
        this.userRepository = db_connect_1.AppDataSource.getRepository(user_entity_1.User);
        this.postRepository = db_connect_1.AppDataSource.getRepository(post_entity_1.Post);
        this.photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
    }
    async createGroup(groupData) {
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
    async getGroupById(id) {
        const group = await this.groupRepository.findOne({
            where: { id },
            relations: ['creator', 'avatar', 'cover']
        });
        if (group) {
            // Получаем количество участников
            const membersCount = await db_connect_1.AppDataSource
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
    async getGroupBySlug(slug) {
        const group = await this.groupRepository.findOne({
            where: { slug },
            relations: ['creator', 'avatar', 'cover']
        });
        if (group) {
            // Получаем количество участников
            const membersCount = await db_connect_1.AppDataSource
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
    async updateGroup(id, groupData) {
        await this.groupRepository.update(id, groupData);
        return this.getGroupById(id);
    }
    async deleteGroup(id) {
        const result = await this.groupRepository.delete(id);
        return result.affected !== 0;
    }
    async getGroupMembers(groupId) {
        try {
            // Вернемся к более простому запросу, но добавим связь с аватарами
            const group = await this.groupRepository.findOne({
                where: { id: groupId },
                relations: ['members', 'members.avatar']
            });
            const members = (group === null || group === void 0 ? void 0 : group.members) || [];
            console.log('Загружено участников группы:', members.length);
            console.log('С аватарами:', members.filter(m => m.avatar).length);
            return members;
        }
        catch (error) {
            console.error('Ошибка при загрузке участников группы:', error);
            return [];
        }
    }
    async getGroupAdmins(groupId) {
        try {
            // Вернемся к более простому запросу, но добавим связь с аватарами
            const group = await this.groupRepository.findOne({
                where: { id: groupId },
                relations: ['admins', 'admins.avatar']
            });
            const admins = (group === null || group === void 0 ? void 0 : group.admins) || [];
            console.log('Загружено администраторов группы:', admins.length);
            console.log('С аватарами:', admins.filter(a => a.avatar).length);
            return admins;
        }
        catch (error) {
            console.error('Ошибка при загрузке администраторов группы:', error);
            return [];
        }
    }
    async addMember(groupId, userId) {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members']
        });
        if (!group)
            return false;
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user)
            return false;
        if (!group.members)
            group.members = [];
        // Проверяем, что пользователь еще не является участником
        if (group.members.some((member) => member.id === userId)) {
            return true; // Уже участник
        }
        group.members.push(user);
        await this.groupRepository.save(group);
        return true;
    }
    async removeMember(groupId, userId) {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members', 'admins']
        });
        if (!group)
            return false;
        // Удаляем из участников
        if (group.members) {
            group.members = group.members.filter((member) => member.id !== userId);
        }
        // Удаляем из администраторов, если он там был
        if (group.admins) {
            group.admins = group.admins.filter((admin) => admin.id !== userId);
        }
        await this.groupRepository.save(group);
        return true;
    }
    async addAdmin(groupId, userId) {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['admins', 'members']
        });
        if (!group)
            return false;
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user)
            return false;
        // Проверяем, что пользователь является участником
        if (!group.members || !group.members.some((member) => member.id === userId)) {
            // Если не участник, сначала добавляем его в участники
            if (!group.members)
                group.members = [];
            group.members.push(user);
        }
        if (!group.admins)
            group.admins = [];
        // Проверяем, что пользователь еще не является администратором
        if (group.admins.some((admin) => admin.id === userId)) {
            return true; // Уже администратор
        }
        group.admins.push(user);
        await this.groupRepository.save(group);
        return true;
    }
    async removeAdmin(groupId, userId) {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['admins']
        });
        if (!group || !group.admins)
            return false;
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user)
            return false;
        group.admins = group.admins.filter((admin) => admin.id !== userId);
        await this.groupRepository.save(group);
        return true;
    }
    async banMember(groupId, userId) {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['members', 'admins', 'bannedUsers']
        });
        if (!group)
            return false;
        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user)
            return false;
        // Проверяем, что пользователь является участником
        const isMember = group.members && group.members.some((member) => member.id === userId);
        // Если пользователь участник, удаляем его из участников
        if (isMember) {
            group.members = group.members.filter((member) => member.id !== userId);
        }
        // Если пользователь админ, удаляем его из админов
        if (group.admins) {
            group.admins = group.admins.filter((admin) => admin.id !== userId);
        }
        // Добавляем пользователя в список забаненных
        if (!group.bannedUsers) {
            group.bannedUsers = [];
        }
        // Проверяем, не забанен ли пользователь уже
        const isBanned = group.bannedUsers.some((bannedUser) => bannedUser.id === userId);
        if (!isBanned) {
            group.bannedUsers.push(user);
        }
        await this.groupRepository.save(group);
        return true;
    }
    async getGroupPosts(groupId, limit = 10, offset = 0) {
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
                }));
            }
        }
        return posts;
    }
    async getAllGroups(limit = 10, offset = 0) {
        const [groups, count] = await this.groupRepository.findAndCount({
            relations: ['creator', 'avatar'],
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset
        });
        // Для каждой группы подсчитываем количество участников и администраторов
        for (const group of groups) {
            // Получаем количество участников
            const membersCount = await db_connect_1.AppDataSource
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
    async getUserGroups(userId) {
        // Проверяем существование пользователя
        const userExists = await this.userRepository.findOne({
            where: { id: userId }
        });
        if (!userExists)
            return [];
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
            const membersCount = await db_connect_1.AppDataSource
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
    async getUserAdminGroups(userId) {
        // Проверяем существование пользователя
        const userExists = await this.userRepository.findOne({
            where: { id: userId }
        });
        if (!userExists)
            return [];
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
            const membersCount = await db_connect_1.AppDataSource
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
    async searchGroups(query, limit = 10, offset = 0) {
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
            const membersCount = await db_connect_1.AppDataSource
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
    async getGroupMusicAlbums(groupId, limit = 20, offset = 0) {
        try {
            // Получаем музыкальные альбомы из базы данных
            const musicAlbums = await db_connect_1.AppDataSource.getRepository('music_albums')
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
        }
        catch (error) {
            console.error('Ошибка при получении музыкальных альбомов группы:', error);
            return [];
        }
    }
    async getGroupMusicAlbumsCount(groupId) {
        try {
            // Получаем количество музыкальных альбомов группы
            const count = await db_connect_1.AppDataSource.getRepository('music_albums')
                .createQueryBuilder('album')
                .where('album.groupId = :groupId', { groupId })
                .getCount();
            return count;
        }
        catch (error) {
            console.error('Ошибка при получении количества музыкальных альбомов группы:', error);
            return 0;
        }
    }
}
exports.GroupService = GroupService;
