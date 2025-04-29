import { Request, Response } from 'express';
import { Equal, In } from 'typeorm';
import { User } from '../entities/user.entity';
import { FriendRequest } from '../entities/friend-request.entity';
import { Friend } from '../entities/friend.entity';
import { AuthenticatedRequest } from '../types/express';
import { AppDataSource } from '../db/db_connect';
import { Photo } from '../entities/photo.entity';

export class FriendController {
    /**
     * Получить список друзей пользователя
     */
    static async getFriends(req: AuthenticatedRequest, res: Response) {
        try {
            // Получаем идентификатор пользователя из параметров URL
            const targetUserId = parseInt(req.params.userId || req.user.id.toString());
            
            console.log(`Получение списка друзей для пользователя с ID: ${targetUserId}`);
            
            if (isNaN(targetUserId)) {
                console.log('Ошибка: Некорректный идентификатор пользователя');
                return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
            }
            
            // Проверяем существование пользователя
            const user = await AppDataSource.getRepository(User).findOne({ where: { id: targetUserId } });
            if (!user) {
                console.log('Ошибка: Пользователь не найден');
                return res.status(404).json({ error: 'Пользователь не найден' });
            }
            
            // Прямой SQL запрос для получения всех связей дружбы
            console.log('Выполняем прямой SQL запрос для получения друзей...');
            const friendConnections = await AppDataSource.query(`
                SELECT f.*, 
                      u.id as "userId", u."firstName" as "userFirstName", u."lastName" as "userLastName", 
                      u.nickname as "userNickname", u.status as "userStatus", u."avatarId" as "userAvatarId",
                      fr.id as "friendId", fr."firstName" as "friendFirstName", fr."lastName" as "friendLastName", 
                      fr.nickname as "friendNickname", fr.status as "friendStatus", fr."avatarId" as "friendAvatarId"
                FROM friends f
                JOIN users u ON f.user_id = u.id
                JOIN users fr ON f.friend_id = fr.id
                WHERE f.user_id = $1 OR f.friend_id = $1
            `, [targetUserId]);
            
            console.log(`Найдено ${friendConnections.length} связей дружбы для пользователя ${targetUserId}`);
            if (friendConnections.length > 0) {
                console.log('Структура первой записи:', JSON.stringify(friendConnections[0], null, 2));
                console.log('Имена свойств первой записи:', Object.keys(friendConnections[0]));
            }
            
            // Обработка результатов прямого запроса
            interface FriendConnection {
                user_id: number;
                friend_id: number;
                userId: number;
                userFirstName: string;
                userLastName: string;
                userNickname: string;
                userStatus: string;
                userAvatarId: number;
                friendId: number;
                friendFirstName: string;
                friendLastName: string;
                friendNickname: string;
                friendStatus: string;
                friendAvatarId: number;
            }
            
            interface FriendData {
                id: number;
                firstName: string;
                lastName: string;
                nickname: string | null;
                status: string | null;
                avatarId?: number;
                avatar?: Photo;
            }
            
            const friendsArray = friendConnections.map((conn: FriendConnection) => {
                // Определяем, какая сторона связи представляет друга
                const isFriend = conn.user_id === targetUserId;
                const friendData: FriendData = {
                    id: isFriend ? conn.friendId : conn.userId,
                    firstName: isFriend ? conn.friendFirstName : conn.userFirstName,
                    lastName: isFriend ? conn.friendLastName : conn.userLastName,
                    nickname: isFriend ? conn.friendNickname : conn.userNickname,
                    status: isFriend ? conn.friendStatus : conn.userStatus,
                    avatarId: isFriend ? conn.friendAvatarId : conn.userAvatarId
                };
                return friendData;
            });
            
            // Дедупликация друзей по id
            const uniqueFriendsMap = new Map<number, FriendData>();
            friendsArray.forEach((friend: FriendData) => {
                uniqueFriendsMap.set(friend.id, friend);
            });
            
            const uniqueFriends: FriendData[] = Array.from(uniqueFriendsMap.values());
            
            console.log(`После дедупликации: ${uniqueFriends.length} уникальных друзей`);
            
            // Загружаем аватары для друзей
            for (const friend of uniqueFriends) {
                if (friend.avatarId) {
                    const avatar = await AppDataSource.getRepository(Photo).findOne({
                        where: { id: friend.avatarId }
                    });
                    if (avatar) {
                        friend.avatar = avatar;
                    }
                    // Удаляем поле avatarId для соответствия интерфейсу клиента
                    delete friend.avatarId;
                }
            }
            
            console.log('Итоговый список друзей:', uniqueFriends);
            return res.status(200).json(uniqueFriends);
        } catch (error) {
            console.error('Ошибка при получении списка друзей:', error);
            return res.status(500).json({ error: 'Ошибка сервера при получении списка друзей' });
        }
    }

    /**
     * Отправить запрос в друзья
     */
    static async sendFriendRequest(req: AuthenticatedRequest, res: Response) {
        try {
            console.log('Получен запрос на добавление в друзья');
            console.log('Текущий пользователь:', req.user);
            console.log('Параметры запроса:', req.params);
            
            const currentUserId = req.user.id;
            const receiverId = parseInt(req.params.userId);
            
            console.log('currentUserId:', currentUserId);
            console.log('receiverId:', receiverId);
            
            if (isNaN(receiverId)) {
                console.log('Ошибка: Некорректный идентификатор пользователя');
                return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
            }
            
            if (currentUserId === receiverId) {
                console.log('Ошибка: Попытка добавить себя в друзья');
                return res.status(400).json({ error: 'Нельзя отправить заявку самому себе' });
            }

            // Проверяем существование получателя
            const receiver = await AppDataSource.getRepository(User).findOne({ where: { id: receiverId } });
            console.log('Получатель:', receiver);
            
            if (!receiver) {
                console.log('Ошибка: Пользователь не найден');
                return res.status(404).json({ error: 'Пользователь не найден' });
            }

            // Проверяем, существует ли уже запрос на дружбу
            const existingRequest = await AppDataSource.getRepository(FriendRequest).findOne({
                where: [
                    { senderId: currentUserId, receiverId: receiverId },
                    { senderId: receiverId, receiverId: currentUserId }
                ]
            });
            
            console.log('Существующий запрос:', existingRequest);

            if (existingRequest) {
                console.log('Ошибка: Запрос уже существует со статусом', existingRequest.status);
                return res.status(400).json({ 
                    error: 'Запрос на дружбу уже существует',
                    status: existingRequest.status
                });
            }

            // Проверяем, являются ли пользователи уже друзьями
            const existingFriendship = await AppDataSource.getRepository(Friend).findOne({
                where: [
                    { userId: currentUserId, friendId: receiverId },
                    { userId: receiverId, friendId: currentUserId }
                ]
            });
            
            console.log('Существующая дружба:', existingFriendship);

            if (existingFriendship) {
                console.log('Ошибка: Пользователи уже друзья');
                return res.status(400).json({ error: 'Пользователи уже являются друзьями' });
            }

            // Создаем новый запрос
            const friendRequest = new FriendRequest();
            friendRequest.senderId = currentUserId;
            friendRequest.receiverId = receiverId;
            friendRequest.status = 'pending';
            
            console.log('Создан запрос:', friendRequest);

            await AppDataSource.getRepository(FriendRequest).save(friendRequest);
            console.log('Запрос сохранен в БД');

            return res.status(201).json({ 
                message: 'Запрос на дружбу отправлен', 
                requestId: friendRequest.id 
            });
        } catch (error) {
            console.error('Ошибка при отправке запроса в друзья:', error);
            return res.status(500).json({ error: 'Ошибка сервера при отправке запроса в друзья' });
        }
    }

    /**
     * Принять запрос в друзья
     */
    static async acceptFriendRequest(req: AuthenticatedRequest, res: Response) {
        try {
            console.log('Получен запрос на принятие заявки в друзья');
            const currentUserId = req.user.id;
            const senderId = parseInt(req.params.userId);
            
            console.log('currentUserId:', currentUserId);
            console.log('senderId:', senderId);
            
            if (isNaN(senderId)) {
                console.log('Ошибка: Некорректный идентификатор пользователя');
                return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
            }

            // Находим запрос на дружбу
            const request = await AppDataSource.getRepository(FriendRequest).findOne({
                where: {
                    senderId: senderId,
                    receiverId: currentUserId,
                    status: 'pending'
                }
            });
            
            console.log('Найденный запрос на дружбу:', request);

            if (!request) {
                console.log('Ошибка: Запрос на дружбу не найден');
                return res.status(404).json({ error: 'Запрос на дружбу не найден' });
            }

            // Обновляем статус запроса
            request.status = 'accepted';
            await AppDataSource.getRepository(FriendRequest).save(request);
            console.log('Статус запроса обновлен на "accepted"');

            // Создаем записи о дружбе в обе стороны
            const friendship1 = new Friend();
            friendship1.userId = currentUserId;
            friendship1.friendId = senderId;
            
            const friendship2 = new Friend();
            friendship2.userId = senderId;
            friendship2.friendId = currentUserId;
            
            console.log('Создаем записи о дружбе:', friendship1, friendship2);

            const savedFriendships = await AppDataSource.getRepository(Friend).save([friendship1, friendship2]);
            console.log('Дружба сохранена:', savedFriendships);

            return res.status(200).json({ 
                message: 'Запрос на дружбу принят',
                friendships: savedFriendships
            });
        } catch (error) {
            console.error('Ошибка при принятии запроса в друзья:', error);
            return res.status(500).json({ error: 'Ошибка сервера при принятии запроса в друзья' });
        }
    }

    /**
     * Отклонить запрос в друзья
     */
    static async rejectFriendRequest(req: AuthenticatedRequest, res: Response) {
        try {
            const currentUserId = req.user.id;
            const senderId = parseInt(req.params.userId);
            
            if (isNaN(senderId)) {
                return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
            }

            // Находим запрос на дружбу
            const request = await AppDataSource.getRepository(FriendRequest).findOne({
                where: {
                    senderId: senderId,
                    receiverId: currentUserId,
                    status: 'pending'
                }
            });

            if (!request) {
                return res.status(404).json({ error: 'Запрос на дружбу не найден' });
            }

            // Обновляем статус запроса
            request.status = 'rejected';
            await AppDataSource.getRepository(FriendRequest).save(request);

            return res.status(200).json({ message: 'Запрос на дружбу отклонен' });
        } catch (error) {
            console.error('Ошибка при отклонении запроса в друзья:', error);
            return res.status(500).json({ error: 'Ошибка сервера при отклонении запроса в друзья' });
        }
    }

    /**
     * Удалить из друзей
     */
    static async removeFriend(req: AuthenticatedRequest, res: Response) {
        try {
            const currentUserId = req.user.id;
            const friendId = parseInt(req.params.userId);
            
            if (isNaN(friendId)) {
                return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
            }

            // Удаляем записи о дружбе в обе стороны
            await AppDataSource.getRepository(Friend)
                .createQueryBuilder()
                .delete()
                .where('(userId = :currentUserId AND friendId = :friendId) OR (userId = :friendId AND friendId = :currentUserId)', 
                    { currentUserId, friendId })
                .execute();

            // Проверяем, существует ли запрос на дружбу и удаляем его
            await AppDataSource.getRepository(FriendRequest)
                .createQueryBuilder()
                .delete()
                .where('(senderId = :currentUserId AND receiverId = :friendId) OR (senderId = :friendId AND receiverId = :currentUserId)', 
                    { currentUserId, friendId })
                .execute();

            return res.status(200).json({ message: 'Пользователь удален из друзей' });
        } catch (error) {
            console.error('Ошибка при удалении из друзей:', error);
            return res.status(500).json({ error: 'Ошибка сервера при удалении из друзей' });
        }
    }

    /**
     * Получить список входящих запросов на дружбу
     */
    static async getIncomingFriendRequests(req: AuthenticatedRequest, res: Response) {
        try {
            console.log('Получение входящих запросов на дружбу');
            const currentUserId = req.user.id;
            console.log('Текущий пользователь ID:', currentUserId);

            // Находим все входящие запросы на дружбу
            const requests = await AppDataSource.getRepository(FriendRequest)
                .createQueryBuilder('request')
                .innerJoinAndSelect('request.sender', 'sender')
                .leftJoinAndSelect('sender.avatar', 'avatar')
                .where('request.receiverId = :userId AND request.status = :status', { 
                    userId: currentUserId, 
                    status: 'pending' 
                })
                .select([
                    'request.id', 'request.createdAt', 'request.updatedAt',
                    'sender.id', 'sender.firstName', 'sender.lastName', 
                    'sender.nickname', 'sender.status', 'avatar.path'
                ])
                .getMany();

            console.log(`Найдено ${requests.length} входящих запросов на дружбу`);
            console.log('Запросы:', requests);

            return res.status(200).json(requests);
        } catch (error) {
            console.error('Ошибка при получении входящих запросов на дружбу:', error);
            return res.status(500).json({ error: 'Ошибка сервера при получении входящих запросов на дружбу' });
        }
    }

    /**
     * Получить статус дружбы между пользователями
     */
    static async getFriendshipStatus(req: AuthenticatedRequest, res: Response) {
        try {
            const currentUserId = req.user.id;
            const userId = parseInt(req.params.userId);
            
            if (isNaN(userId)) {
                return res.status(400).json({ error: 'Некорректный идентификатор пользователя' });
            }
            
            if (currentUserId === userId) {
                return res.status(200).json({ status: 'self' });
            }

            // Проверяем, являются ли пользователи друзьями
            const existingFriendship = await AppDataSource.getRepository(Friend).findOne({
                where: [
                    { userId: currentUserId, friendId: userId },
                    { userId: userId, friendId: currentUserId }
                ]
            });

            if (existingFriendship) {
                return res.status(200).json({ status: 'friends' });
            }

            // Проверяем запросы в друзья
            const existingRequest = await AppDataSource.getRepository(FriendRequest).findOne({
                where: [
                    { senderId: currentUserId, receiverId: userId },
                    { senderId: userId, receiverId: currentUserId }
                ]
            });

            if (existingRequest) {
                if (existingRequest.status === 'rejected') {
                    return res.status(200).json({ status: 'none' });
                }
                
                if (existingRequest.senderId === currentUserId) {
                    return res.status(200).json({ status: 'pending_sent' });
                } else {
                    return res.status(200).json({ status: 'pending_received' });
                }
            }

            return res.status(200).json({ status: 'none' });
        } catch (error) {
            console.error('Ошибка при получении статуса дружбы:', error);
            return res.status(500).json({ error: 'Ошибка сервера при получении статуса дружбы' });
        }
    }
} 