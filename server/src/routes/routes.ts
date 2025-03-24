import { Router, Request, Response } from 'express';
import { AppDataSource } from '../db/db_connect';
import postRoutes from './post.routes';
import userRoutes from './user.routes';
import chatRoutes from './chat.routes';
import authRoutes from './auth.routes';
import photoRoutes from './photo.routes';

export const initializeRoutes = async () => {
    // Убеждаемся, что база данных инициализирована
    if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
    }

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

    return router;
};
