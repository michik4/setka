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
const _1710000000000_AddUserStatus_1 = require("../migrations/1710000000000-AddUserStatus");
const _1710000000001_AddUserAvatar_1 = require("../migrations/1710000000001-AddUserAvatar");
const _1710000000002_AddWallPostIdToPhotos_1 = require("../migrations/1710000000002-AddWallPostIdToPhotos");
const _1710000000003_ChangePhotoRelations_1 = require("../migrations/1710000000003-ChangePhotoRelations");
const _1709123456789_AddPhotoExtensionAndIsDeleted_1 = require("../migrations/1709123456789-AddPhotoExtensionAndIsDeleted");
const _1680078632000_CreateMusicTable_1 = require("../migrations/1680078632000-CreateMusicTable");
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
    synchronize: true,
    dropSchema: false,
    logging: process.env.NODE_ENV !== "production",
    entities: [user_entity_1.User, post_entity_1.Post, photo_entity_1.Photo, session_entity_1.Session, chat_entity_1.Chat, message_entity_1.Message, wall_entity_1.WallPost, like_entity_1.Like, album_entity_1.Album, music_entity_1.MusicTrack],
    migrations: [
        _1710000000000_AddUserStatus_1.AddUserStatus1710000000000,
        _1710000000001_AddUserAvatar_1.AddUserAvatar1710000000001,
        _1710000000002_AddWallPostIdToPhotos_1.AddWallPostIdToPhotos1710000000002,
        _1710000000003_ChangePhotoRelations_1.ChangePhotoRelations1710000000003,
        _1709123456789_AddPhotoExtensionAndIsDeleted_1.AddPhotoExtensionAndIsDeleted1709123456789,
        _1680078632000_CreateMusicTable_1.CreateMusicTable1680078632000
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
