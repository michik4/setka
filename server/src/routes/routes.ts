import { Express, Router, Request, Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import postRoutes from './post.routes';
import userRoutes from './user.routes';
import chatRoutes from './chat.routes';
import authRoutes from './auth.routes';
import photoRoutes from './photo.routes';
import wallRoutes from './wall.routes';
import albumRoutes from './album.routes';
import musicRoutes from './music.routes';

export const initializeRoutes = (app: Express) => {
    const router = Router();

    // Логирование всех запросов к API
    router.use((req: Request, res: Response, next) => {
        console.log(`[API Router] Получен запрос: ${req.method} ${req.baseUrl}${req.path}`);
        next();
    });

    console.log('Инициализация маршрутов API...');

    // Подключаем все маршруты
    router.use('/posts', postRoutes);
    console.log('Подключены маршруты постов:', postRoutes.stack.map(r => r.route?.path).filter(Boolean));
    
    router.use('/users', userRoutes);
    console.log('Подключены маршруты пользователей');
    
    router.use('/chats', chatRoutes);
    console.log('Подключены маршруты чатов');
    
    router.use('/auth', authRoutes);
    console.log('Подключены маршруты аутентификации');
    
    router.use('/photos', photoRoutes);
    console.log('Подключены маршруты фотографий');

    router.use('/wall', wallRoutes);
    console.log('Подключены маршруты стены');

    router.use('/albums', albumRoutes);
    console.log('Подключены маршруты альбомов');

    router.use('/music', musicRoutes);
    console.log('Подключены маршруты музыки');

    // Подключаем все маршруты под префиксом /api
    app.use('/api', router);
};
