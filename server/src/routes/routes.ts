import { Router } from "express";
import userRoutes from './user.routes';
import chatRoutes from './chat.routes';
import authRoutes from './auth.routes';
import photoRoutes from './photo.routes';

const router = Router();

// Базовый маршрут
router.get('/', (req, res) => {
    res.json({
        name: 'ВСети API',
        version: '1.0.0',
        endpoints: {
            chats: '/api/chats'
        }
    });
});

router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/auth', authRoutes);
router.use('/photos', photoRoutes);

export default router;
