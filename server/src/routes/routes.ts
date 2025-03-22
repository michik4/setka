import { Router } from "express";
import userRoutes from './user.routes';
import chatRoutes from './chat.routes';
import authRoutes from './auth.routes';

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

export default router;
