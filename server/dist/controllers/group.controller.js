"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupController = exports.uploadGroupAvatar = void 0;
const group_service_1 = require("../services/group.service");
const user_service_1 = require("../services/user.service");
const post_service_1 = require("../services/post.service");
const photo_service_1 = require("../services/photo.service");
const db_connect_1 = require("../db/db_connect");
const path = __importStar(require("path"));
const multer_1 = __importDefault(require("multer"));
const fs = __importStar(require("fs"));
const photo_entity_1 = require("../entities/photo.entity");
// Конфигурация multer для загрузки аватаров групп
const groupAvatarStorage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/photos';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
exports.uploadGroupAvatar = (0, multer_1.default)({
    storage: groupAvatarStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Неверный тип файла. Разрешены только JPEG, PNG и GIF.'));
        }
    }
});
class GroupController {
    constructor() {
        // Создать новую группу
        this.createGroup = async (req, res) => {
            var _a;
            try {
                const { name, slug, description, isPrivate } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                if (!name || !slug) {
                    return res.status(400).json({ message: 'Название и URL-адрес группы обязательны' });
                }
                // Проверяем, не занят ли slug
                const existingGroup = await this.groupService.getGroupBySlug(slug);
                if (existingGroup) {
                    return res.status(400).json({ message: 'Такой URL-адрес уже занят' });
                }
                const group = await this.groupService.createGroup({
                    name,
                    slug,
                    description,
                    creatorId: userId,
                    isPrivate
                });
                return res.status(201).json(group);
            }
            catch (error) {
                console.error('Ошибка при создании группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить группу по ID
        this.getGroupById = async (req, res) => {
            try {
                const { id } = req.params;
                const group = await this.groupService.getGroupById(Number(id));
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                return res.json(group);
            }
            catch (error) {
                console.error('Ошибка при получении группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить группу по slug
        this.getGroupBySlug = async (req, res) => {
            try {
                const { slug } = req.params;
                const group = await this.groupService.getGroupBySlug(slug);
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                return res.json(group);
            }
            catch (error) {
                console.error('Ошибка при получении группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Обновить информацию о группе
        this.updateGroup = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const { name, description, isPrivate } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const group = await this.groupService.getGroupById(Number(id));
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                // Проверяем права доступа (создатель или администратор)
                const isCreator = group.creatorId === userId;
                const isAdmin = await this.isGroupAdmin(Number(id), userId);
                if (!isCreator && !isAdmin) {
                    return res.status(403).json({ message: 'Нет прав на редактирование группы' });
                }
                const updatedGroup = await this.groupService.updateGroup(Number(id), {
                    name,
                    description,
                    isPrivate
                });
                return res.json(updatedGroup);
            }
            catch (error) {
                console.error('Ошибка при обновлении группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Удалить группу
        this.deleteGroup = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const group = await this.groupService.getGroupById(Number(id));
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                // Только создатель может удалить группу
                if (group.creatorId !== userId) {
                    return res.status(403).json({ message: 'Нет прав на удаление группы' });
                }
                await this.groupService.deleteGroup(Number(id));
                return res.status(204).send();
            }
            catch (error) {
                console.error('Ошибка при удалении группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить список участников группы
        this.getGroupMembers = async (req, res) => {
            try {
                const { id } = req.params;
                const members = await this.groupService.getGroupMembers(Number(id));
                return res.json(members);
            }
            catch (error) {
                console.error('Ошибка при получении участников группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить список администраторов группы
        this.getGroupAdmins = async (req, res) => {
            try {
                const { id } = req.params;
                const admins = await this.groupService.getGroupAdmins(Number(id));
                return res.json(admins);
            }
            catch (error) {
                console.error('Ошибка при получении администраторов группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Вступить в группу
        this.joinGroup = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const success = await this.groupService.addMember(Number(id), userId);
                if (!success) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                return res.status(200).json({ message: 'Вы успешно вступили в группу' });
            }
            catch (error) {
                console.error('Ошибка при вступлении в группу:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Выйти из группы
        this.leaveGroup = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const group = await this.groupService.getGroupById(Number(id));
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                // Проверяем, что пользователь не создатель группы
                if (group.creatorId === userId) {
                    return res.status(403).json({ message: 'Создатель не может выйти из группы' });
                }
                const success = await this.groupService.removeMember(Number(id), userId);
                if (!success) {
                    return res.status(404).json({ message: 'Вы не являетесь участником группы' });
                }
                return res.status(200).json({ message: 'Вы успешно вышли из группы' });
            }
            catch (error) {
                console.error('Ошибка при выходе из группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Добавить администратора
        this.addAdmin = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const { userId: targetUserId } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const group = await this.groupService.getGroupById(Number(id));
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                // Проверяем права доступа (только создатель может добавлять админов)
                if (group.creatorId !== userId) {
                    return res.status(403).json({ message: 'Нет прав на управление администраторами' });
                }
                const success = await this.groupService.addAdmin(Number(id), Number(targetUserId));
                if (!success) {
                    return res.status(404).json({ message: 'Пользователь не найден' });
                }
                return res.status(200).json({ message: 'Администратор успешно добавлен' });
            }
            catch (error) {
                console.error('Ошибка при добавлении администратора:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Удалить администратора
        this.removeAdmin = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const { userId: targetUserId } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const group = await this.groupService.getGroupById(Number(id));
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                // Проверяем права доступа (только создатель может удалять админов)
                if (group.creatorId !== userId) {
                    return res.status(403).json({ message: 'Нет прав на управление администраторами' });
                }
                const success = await this.groupService.removeAdmin(Number(id), Number(targetUserId));
                if (!success) {
                    return res.status(404).json({ message: 'Администратор не найден' });
                }
                return res.status(200).json({ message: 'Администратор успешно удален' });
            }
            catch (error) {
                console.error('Ошибка при удалении администратора:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить посты группы
        this.getGroupPosts = async (req, res) => {
            try {
                const { id } = req.params;
                const { limit = 10, offset = 0 } = req.query;
                const posts = await this.groupService.getGroupPosts(Number(id), Number(limit), Number(offset));
                // Дополнительно загружаем информацию об альбомах для каждого поста
                for (const post of posts) {
                    try {
                        // Загружаем альбомы напрямую через SQL-запрос, если они есть
                        const albumsQuery = await db_connect_1.AppDataSource.query(`
                        SELECT a.* FROM albums a
                        JOIN post_album pa ON a.id = pa."albumId"
                        WHERE pa."postId" = $1
                    `, [post.id]);
                        if (albumsQuery && albumsQuery.length > 0) {
                            // Загружаем фотографии для каждого альбома
                            for (const album of albumsQuery) {
                                const photosQuery = await db_connect_1.AppDataSource.query(`
                                SELECT p.* FROM photos p
                                JOIN album_photos ap ON p.id = ap."photoId"
                                WHERE ap."albumId" = $1
                                LIMIT 5
                            `, [album.id]);
                                album.photos = photosQuery || [];
                            }
                            // Добавляем albums к посту
                            post.albums = albumsQuery;
                        }
                        else {
                            post.albums = [];
                        }
                    }
                    catch (error) {
                        console.error(`Ошибка при загрузке альбомов для поста ${post.id}:`, error);
                        post.albums = [];
                    }
                }
                return res.json(posts);
            }
            catch (error) {
                console.error('Ошибка при получении постов группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить все группы
        this.getAllGroups = async (req, res) => {
            try {
                const { limit = 10, offset = 0 } = req.query;
                const [groups, total] = await this.groupService.getAllGroups(Number(limit), Number(offset));
                return res.json({
                    items: groups,
                    total
                });
            }
            catch (error) {
                console.error('Ошибка при получении списка групп:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить группы пользователя
        this.getUserGroups = async (req, res) => {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const groups = await this.groupService.getUserGroups(userId);
                return res.json(groups);
            }
            catch (error) {
                console.error('Ошибка при получении групп пользователя:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Поиск групп
        this.searchGroups = async (req, res) => {
            try {
                const { query } = req.query;
                const { limit = 10, offset = 0 } = req.query;
                if (!query || typeof query !== 'string') {
                    return res.status(400).json({ message: 'Введите поисковый запрос' });
                }
                const [groups, total] = await this.groupService.searchGroups(query, Number(limit), Number(offset));
                return res.json({
                    items: groups,
                    total
                });
            }
            catch (error) {
                console.error('Ошибка при поиске групп:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Удалить участника из группы
        this.removeMember = async (req, res) => {
            var _a;
            try {
                const { id, userId: targetUserId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const group = await this.groupService.getGroupById(Number(id));
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                // Проверяем права доступа (создатель или администратор)
                const isCreator = group.creatorId === userId;
                const isAdmin = await this.isGroupAdmin(Number(id), userId);
                if (!isCreator && !isAdmin) {
                    return res.status(403).json({ message: 'Нет прав на удаление участников' });
                }
                // Администратор не может удалить создателя или другого администратора
                if (!isCreator && isAdmin) {
                    const targetIsCreator = group.creatorId === Number(targetUserId);
                    const targetIsAdmin = await this.isGroupAdmin(Number(id), Number(targetUserId));
                    if (targetIsCreator || targetIsAdmin) {
                        return res.status(403).json({ message: 'Администратор не может удалить создателя или другого администратора' });
                    }
                }
                const success = await this.groupService.removeMember(Number(id), Number(targetUserId));
                if (!success) {
                    return res.status(404).json({ message: 'Участник не найден' });
                }
                return res.status(200).json({ message: 'Участник успешно удален' });
            }
            catch (error) {
                console.error('Ошибка при удалении участника:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Забанить участника
        this.banMember = async (req, res) => {
            var _a;
            try {
                const { id } = req.params;
                const { userId: targetUserId } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                const group = await this.groupService.getGroupById(Number(id));
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                // Проверяем, что пользователь является создателем группы
                if (group.creatorId !== userId) {
                    return res.status(403).json({ message: 'Только создатель может банить участников' });
                }
                // Создатель не может забанить себя
                if (Number(targetUserId) === group.creatorId) {
                    return res.status(403).json({ message: 'Создатель не может забанить сам себя' });
                }
                const success = await this.groupService.banMember(Number(id), Number(targetUserId));
                if (!success) {
                    return res.status(404).json({ message: 'Участник не найден' });
                }
                return res.status(200).json({ message: 'Участник успешно забанен' });
            }
            catch (error) {
                console.error('Ошибка при бане участника:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Вспомогательный метод для проверки прав администратора
        this.isGroupAdmin = async (groupId, userId) => {
            const admins = await this.groupService.getGroupAdmins(groupId);
            return admins.some(admin => admin.id === userId);
        };
        // Загрузить аватар для группы
        this.uploadAvatar = async (req, res) => {
            var _a;
            try {
                if (!req.file) {
                    return res.status(400).json({ message: 'Файл не загружен' });
                }
                const groupId = parseInt(req.params.id);
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
                if (!userId) {
                    return res.status(401).json({ message: 'Не авторизован' });
                }
                // Получаем группу и проверяем права доступа
                const group = await this.groupService.getGroupById(groupId);
                if (!group) {
                    return res.status(404).json({ message: 'Группа не найдена' });
                }
                // Проверяем права доступа (создатель или администратор)
                const isCreator = group.creatorId === userId;
                const isAdmin = await this.isGroupAdmin(groupId, userId);
                if (!isCreator && !isAdmin) {
                    return res.status(403).json({ message: 'Нет прав на изменение аватара группы' });
                }
                // Создаем запись о фото
                const photoRepository = db_connect_1.AppDataSource.getRepository(photo_entity_1.Photo);
                const photo = photoRepository.create({
                    filename: req.file.filename,
                    originalName: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    path: req.file.filename, // Сохраняем только имя файла
                    extension: path.extname(req.file.originalname),
                    userId: userId // Сохраняем ID пользователя, загрузившего аватар
                });
                await photoRepository.save(photo);
                // Обновляем аватар группы
                await this.groupService.updateGroup(groupId, { avatarId: photo.id });
                // Получаем обновленную группу с аватаром
                const updatedGroup = await this.groupService.getGroupById(groupId);
                return res.json(updatedGroup);
            }
            catch (error) {
                console.error('Ошибка при загрузке аватара группы:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить группы, в которых пользователь является администратором
        this.getUserAdminGroups = async (req, res) => {
            try {
                const { userId } = req.params;
                const adminGroups = await this.groupService.getUserAdminGroups(Number(userId));
                return res.json(adminGroups);
            }
            catch (error) {
                console.error('Ошибка при получении администрируемых групп:', error);
                return res.status(500).json({ message: 'Внутренняя ошибка сервера' });
            }
        };
        // Получить фотографии группы из постов
        this.getGroupPhotos = async (req, res) => {
            try {
                const { id } = req.params;
                const { limit = 20, offset = 0 } = req.query;
                const groupId = Number(id);
                // Получаем посты группы с фотографиями
                const posts = await this.groupService.getGroupPosts(groupId, 100, 0);
                // Извлекаем все фотографии из постов, удаляем дубликаты
                const photosMap = new Map();
                posts.forEach(post => {
                    if (post.photos && post.photos.length > 0) {
                        post.photos.forEach(photo => {
                            if (!photo.isDeleted && !photosMap.has(photo.id)) {
                                photosMap.set(photo.id, photo);
                            }
                        });
                    }
                });
                // Преобразуем Map в массив и сортируем по дате создания (новые вначале)
                const photos = Array.from(photosMap.values())
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(Number(offset), Number(offset) + Number(limit));
                res.json({
                    items: photos,
                    total: photosMap.size
                });
            }
            catch (err) {
                console.error('Ошибка при получении фотографий группы:', err);
                res.status(500).json({ error: 'Ошибка при получении фотографий группы' });
            }
        };
        // Получить альбомы группы из постов
        this.getGroupAlbums = async (req, res) => {
            try {
                const { id } = req.params;
                const { limit = 20, offset = 0 } = req.query;
                const groupId = Number(id);
                // Получаем посты группы
                const posts = await this.groupService.getGroupPosts(groupId, 100, 0);
                // Извлекаем все альбомы из постов, удаляем дубликаты
                const albumsMap = new Map();
                posts.forEach(post => {
                    if (post.albums && post.albums.length > 0) {
                        post.albums.forEach(album => {
                            if (!albumsMap.has(album.id)) {
                                // Фильтруем удаленные фотографии
                                album.photos = album.photos.filter(photo => !photo.isDeleted);
                                album.photosCount = album.photos.length;
                                if (album.photosCount > 0) {
                                    albumsMap.set(album.id, album);
                                }
                            }
                        });
                    }
                });
                // Преобразуем Map в массив и сортируем по дате создания (новые вначале)
                const albums = Array.from(albumsMap.values())
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(Number(offset), Number(offset) + Number(limit));
                res.json({
                    items: albums,
                    total: albumsMap.size
                });
            }
            catch (err) {
                console.error('Ошибка при получении альбомов группы:', err);
                res.status(500).json({ error: 'Ошибка при получении альбомов группы' });
            }
        };
        // Получить треки группы из постов
        this.getGroupTracks = async (req, res) => {
            try {
                const { id } = req.params;
                const { limit = 20, offset = 0 } = req.query;
                const groupId = Number(id);
                // Получаем посты группы с треками
                const posts = await this.groupService.getGroupPosts(groupId, 100, 0);
                // Извлекаем все треки из постов, удаляем дубликаты
                const tracksMap = new Map();
                posts.forEach(post => {
                    if (post.tracks && post.tracks.length > 0) {
                        post.tracks.forEach(track => {
                            if (!tracksMap.has(track.id)) {
                                // Добавляем audioUrl к треку
                                track.audioUrl = `/api/music/file/${track.filename}`;
                                tracksMap.set(track.id, track);
                            }
                        });
                    }
                });
                // Преобразуем Map в массив и сортируем по дате добавления (новые вначале)
                const tracks = Array.from(tracksMap.values())
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .slice(Number(offset), Number(offset) + Number(limit));
                res.json({
                    items: tracks,
                    total: tracksMap.size
                });
            }
            catch (err) {
                console.error('Ошибка при получении треков группы:', err);
                res.status(500).json({ error: 'Ошибка при получении треков группы' });
            }
        };
        // Получить музыкальные альбомы группы
        this.getGroupMusicAlbums = async (req, res) => {
            try {
                const { id } = req.params;
                const { limit = 20, offset = 0 } = req.query;
                const groupId = Number(id);
                // Получаем музыкальные альбомы группы
                const musicAlbums = await this.groupService.getGroupMusicAlbums(groupId, Number(limit), Number(offset));
                // Получаем общее количество музыкальных альбомов
                const totalMusicAlbums = await this.groupService.getGroupMusicAlbumsCount(groupId);
                res.json({
                    items: musicAlbums,
                    total: totalMusicAlbums
                });
            }
            catch (err) {
                console.error('Ошибка при получении музыкальных альбомов группы:', err);
                res.status(500).json({ error: 'Ошибка при получении музыкальных альбомов группы' });
            }
        };
        this.groupService = new group_service_1.GroupService();
        this.userService = new user_service_1.UserService();
        this.postService = new post_service_1.PostService();
        this.photoService = new photo_service_1.PhotoService();
    }
}
exports.GroupController = GroupController;
