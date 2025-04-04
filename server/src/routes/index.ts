import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import postRoutes from './post.routes';
import photoRoutes from './photo.routes';
import albumRoutes from './album.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/photos', photoRoutes);
router.use('/albums', albumRoutes);

export default router; 