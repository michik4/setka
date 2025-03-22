import { Router } from 'express';
import { PhotoController, upload } from '../controllers/photo.controller';

const router = Router();
const photoController = new PhotoController();

// Загрузка фотографии
router.post('/', upload.single('photo'), photoController.uploadPhoto.bind(photoController));

// Получение фотографий пользователя
router.get('/user/:userId', photoController.getUserPhotos.bind(photoController));

// Удаление фотографии
router.delete('/:id', photoController.deletePhoto.bind(photoController));

export default router; 