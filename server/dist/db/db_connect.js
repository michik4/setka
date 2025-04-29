"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeDB = exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
const dotenv_1 = __importDefault(require("dotenv"));
const user_entity_1 = require("../entities/user.entity");
const post_entity_1 = require("../entities/post.entity");
const photo_entity_1 = require("../entities/photo.entity");
const session_entity_1 = require("../entities/session.entity");
const chat_entity_1 = require("../entities/chat.entity");
const message_entity_1 = require("../entities/message.entity");
const wall_entity_1 = require("../entities/wall.entity");
const like_entity_1 = require("../entities/like.entity");
const music_entity_1 = require("../entities/music.entity");
const album_entity_1 = require("../entities/album.entity");
const group_entity_1 = require("../entities/group.entity");
const group_member_entity_1 = require("../entities/group-member.entity");
const post_album_entity_1 = require("../entities/post_album.entity");
const comment_entity_1 = require("../entities/comment.entity");
const friend_entity_1 = require("../entities/friend.entity");
const friend_request_entity_1 = require("../entities/friend-request.entity");
const conversation_entity_1 = require("../entities/conversation.entity");
const music_album_entity_1 = require("../entities/music_album.entity");
const _1710000000000_AddUserStatus_1 = require("../migrations/1710000000000-AddUserStatus");
const _1710000000001_AddUserAvatar_1 = require("../migrations/1710000000001-AddUserAvatar");
const _1710000000002_AddWallPostIdToPhotos_1 = require("../migrations/1710000000002-AddWallPostIdToPhotos");
const _1710000000003_ChangePhotoRelations_1 = require("../migrations/1710000000003-ChangePhotoRelations");
const _1709123456789_AddPhotoExtensionAndIsDeleted_1 = require("../migrations/1709123456789-AddPhotoExtensionAndIsDeleted");
const _1680078632000_CreateMusicTable_1 = require("../migrations/1680078632000-CreateMusicTable");
const _1680078633000_CreatePostsTracks_1 = require("../migrations/1680078633000-CreatePostsTracks");
const _1743000000000_CreateGroups_1 = require("../migrations/1743000000000-CreateGroups");
const _1742846973457_AddWallOwnerIdToPosts_1 = require("../migrations/1742846973457-AddWallOwnerIdToPosts");
const _1743001000000_CreateFriendsSystem_1 = require("../migrations/1743001000000-CreateFriendsSystem");
const _1720000000001_CreateMusicAlbums_1 = require("../migrations/1720000000001-CreateMusicAlbums");
// Загружаем переменные окружения
dotenv_1.default.config();
// Создаем подключение к базе данных
exports.AppDataSource = new typeorm_1.DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432"),
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "setka",
    synchronize: false,
    dropSchema: false,
    logging: process.env.NODE_ENV !== "production",
    entities: [user_entity_1.User, post_entity_1.Post, photo_entity_1.Photo, session_entity_1.Session, chat_entity_1.Chat, message_entity_1.Message, wall_entity_1.WallPost, like_entity_1.Like, album_entity_1.Album, music_entity_1.MusicTrack, group_entity_1.Group, group_member_entity_1.GroupMember, post_album_entity_1.PostAlbum, comment_entity_1.Comment, friend_entity_1.Friend, friend_request_entity_1.FriendRequest, conversation_entity_1.Conversation, music_album_entity_1.MusicAlbum],
    migrations: [
        _1710000000000_AddUserStatus_1.AddUserStatus1710000000000,
        _1710000000001_AddUserAvatar_1.AddUserAvatar1710000000001,
        _1710000000002_AddWallPostIdToPhotos_1.AddWallPostIdToPhotos1710000000002,
        _1710000000003_ChangePhotoRelations_1.ChangePhotoRelations1710000000003,
        _1709123456789_AddPhotoExtensionAndIsDeleted_1.AddPhotoExtensionAndIsDeleted1709123456789,
        _1680078632000_CreateMusicTable_1.CreateMusicTable1680078632000,
        _1680078633000_CreatePostsTracks_1.CreatePostsTracks1680078633000,
        _1743000000000_CreateGroups_1.CreateGroups1743000000000,
        _1742846973457_AddWallOwnerIdToPosts_1.AddWallOwnerIdToPosts1742846973457,
        _1743001000000_CreateFriendsSystem_1.CreateFriendsSystem1743001000000,
        _1720000000001_CreateMusicAlbums_1.CreateMusicAlbums1720000000001
    ],
    subscribers: [],
    migrationsTableName: "migrations"
});
// Функция инициализации подключения
const initializeDB = async () => {
    try {
        await exports.AppDataSource.initialize();
        console.log("База данных успешно подключена");
    }
    catch (error) {
        console.error("Ошибка при подключении к базе данных:", error);
        throw error;
    }
};
exports.initializeDB = initializeDB;
