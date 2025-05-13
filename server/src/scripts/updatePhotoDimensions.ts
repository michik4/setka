import { AppDataSource } from '../db/db_connect';
import { Photo } from '../entities/photo.entity';
import * as path from 'path';
import * as fs from 'fs';
import { ImageMetadata } from '../utils/imageMetadata';
import { IsNull } from 'typeorm';

/**
 * Скрипт для обновления размеров всех существующих фотографий в базе данных
 */
async function updatePhotoDimensions() {
  console.log('Запуск обновления размеров фотографий...');
  
  try {
    // Инициализируем подключение к базе данных
    await AppDataSource.initialize();
    
    // Получаем репозиторий фотографий
    const photoRepository = AppDataSource.getRepository(Photo);
    
    // Выбираем все фотографии, у которых нет данных о размерах
    const photos = await photoRepository.find({
      where: [
        { width: IsNull() },
        { height: IsNull() }
      ]
    });
    
    console.log(`Найдено ${photos.length} фотографий без данных о размерах`);
    
    let updatedCount = 0;
    let failedCount = 0;
    
    for (const photo of photos) {
      try {
        // Проверяем, можно ли получить размеры из имени файла
        const dimensionsFromFilename = ImageMetadata.extractDimensionsFromFilename(photo.path);
        
        if (dimensionsFromFilename) {
          // Если можем получить размеры из имени файла, используем их
          photo.width = dimensionsFromFilename.width;
          photo.height = dimensionsFromFilename.height;
          await photoRepository.save(photo);
          updatedCount++;
          console.log(`[${updatedCount}/${photos.length}] Обновлены размеры из имени файла для фото #${photo.id}: ${dimensionsFromFilename.width}x${dimensionsFromFilename.height}`);
          continue;
        }
        
        // Если не получили размеры из имени файла, пытаемся получить из самого изображения
        const filePath = path.join(process.cwd(), 'uploads/photos', photo.path);
        
        if (fs.existsSync(filePath)) {
          const metadata = await ImageMetadata.extractWithSharp(filePath);
          
          if (metadata) {
            photo.width = metadata.width;
            photo.height = metadata.height;
            
            // Обновляем имя файла с информацией о размерах
            const newFilename = ImageMetadata.createFilenameWithDimensions(
              photo.path,
              metadata.width,
              metadata.height
            );
            
            // Переименовываем файл с указанием размеров
            const newFilePath = path.join(process.cwd(), 'uploads/photos', newFilename);
            fs.renameSync(filePath, newFilePath);
            photo.path = newFilename;
            photo.filename = newFilename;
            
            await photoRepository.save(photo);
            updatedCount++;
            console.log(`[${updatedCount}/${photos.length}] Обновлены размеры из файла для фото #${photo.id}: ${metadata.width}x${metadata.height}`);
          } else {
            failedCount++;
            console.error(`Не удалось извлечь метаданные из файла для фото #${photo.id}: ${filePath}`);
          }
        } else {
          failedCount++;
          console.error(`Файл не найден для фото #${photo.id}: ${filePath}`);
        }
      } catch (error) {
        failedCount++;
        console.error(`Ошибка при обработке фото #${photo.id}:`, error);
      }
    }
    
    console.log(`Обновление размеров фотографий завершено`);
    console.log(`Успешно обновлено: ${updatedCount}`);
    console.log(`Не удалось обновить: ${failedCount}`);
    
  } catch (error) {
    console.error('Ошибка при обновлении размеров фотографий:', error);
  } finally {
    // Закрываем соединение с базой данных
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Запуск скрипта
updatePhotoDimensions()
  .then(() => {
    console.log('Скрипт успешно выполнен');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Ошибка при выполнении скрипта:', error);
    process.exit(1);
  }); 