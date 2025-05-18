import { DataSource } from "typeorm"
import dotenv from 'dotenv'
import path from 'path'
import { User } from "../entities/user.entity"
import { Post } from "../entities/post.entity"
import { Photo } from "../entities/photo.entity"
import { Session } from "../entities/session.entity"
import { Chat } from "../entities/chat.entity"
import { Message } from "../entities/message.entity"
import { WallPost } from "../entities/wall.entity"
import { Like } from "../entities/like.entity"
import { MusicTrack } from "../entities/music.entity"
import { Album } from "../entities/album.entity"
import { Group } from "../entities/group.entity"
import { GroupMember } from "../entities/group-member.entity"
import { PostAlbum } from "../entities/post_album.entity"
import { PostMusicAlbum } from "../entities/post_music_album.entity"
import { Comment } from "../entities/comment.entity"
import { Friend } from "../entities/friend.entity"
import { FriendRequest } from "../entities/friend-request.entity"
import { Conversation } from "../entities/conversation.entity"
import { MusicAlbum } from "../entities/music_album.entity"
import { AddUserStatus1710000000000 } from "../migrations/1710000000000-AddUserStatus"
import { AddUserAvatar1710000000001 } from "../migrations/1710000000001-AddUserAvatar"
import { AddWallPostIdToPhotos1710000000002 } from "../migrations/1710000000002-AddWallPostIdToPhotos"
import { ChangePhotoRelations1710000000003 } from "../migrations/1710000000003-ChangePhotoRelations"
import { AddPhotoExtensionAndIsDeleted1709123456789 } from "../migrations/1709123456789-AddPhotoExtensionAndIsDeleted"
import { CreateMusicTable1680078632000 } from "../migrations/1680078632000-CreateMusicTable"
import { CreatePostsTracks1680078633000 } from "../migrations/1680078633000-CreatePostsTracks"
import { CreateGroups1743000000000 } from "../migrations/1743000000000-CreateGroups"
import { AddWallOwnerIdToPosts1742846973457 } from "../migrations/1742846973457-AddWallOwnerIdToPosts"
import { CreateFriendsSystem1743001000000 } from "../migrations/1743001000000-CreateFriendsSystem"
import { CreateMusicAlbums1720000000001 } from "../migrations/1720000000001-CreateMusicAlbums"
import { CreatePostMusicAlbums1720000000010 } from "../migrations/1720000000010-CreatePostMusicAlbums"
import { config } from "../config"
// Загружаем переменные окружения
dotenv.config()

// Создаем подключение к базе данных
export const AppDataSource = new DataSource({
    type: "postgres",
    host: config.DB_HOST || "localhost",
    port: parseInt(config.DB_PORT as string) || 5432,
    username: config.DB_USERNAME || "postgres",
    password: config.DB_PASSWORD || "postgres",
    database: config.DB_DATABASE || "setka",
    synchronize: false,
    dropSchema: false,
    logging: config.NODE_ENV !== "production",
    entities: [User, Post, Photo, Session, Chat, Message, WallPost, Like, Album, MusicTrack, Group, GroupMember, PostAlbum, PostMusicAlbum, Comment, Friend, FriendRequest, Conversation, MusicAlbum],
    migrations: [
        AddUserStatus1710000000000,
        AddUserAvatar1710000000001,
        AddWallPostIdToPhotos1710000000002,
        ChangePhotoRelations1710000000003,
        AddPhotoExtensionAndIsDeleted1709123456789,
        CreateMusicTable1680078632000,
        CreatePostsTracks1680078633000,
        CreateGroups1743000000000,
        AddWallOwnerIdToPosts1742846973457,
        CreateFriendsSystem1743001000000,
        CreateMusicAlbums1720000000001,
        CreatePostMusicAlbums1720000000010
    ],
    subscribers: [],
    migrationsTableName: "migrations"
})

// Функция инициализации подключения
export const initializeDB = async () => {
    try {
        await AppDataSource.initialize()
        console.log("База данных успешно подключена")
    } catch (error) {
        console.error("Ошибка при подключении к базе данных:", error)
        throw error
    }
}
