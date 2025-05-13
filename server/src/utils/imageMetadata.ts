import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import sharp from 'sharp';

const readFile = promisify(fs.readFile);

/**
 * Утилита для извлечения метаданных из изображений
 */
export class ImageMetadata {
  /**
   * Извлекает метаданные изображения с помощью Sharp
   * @param filePath путь к изображению
   */
  static async extractWithSharp(filePath: string): Promise<{width: number, height: number} | null> {
    try {
      // Получаем метаданные из изображения с помощью Sharp
      const metadata = await sharp(filePath).metadata();
      
      if (metadata && metadata.width && metadata.height) {
        return {
          width: metadata.width,
          height: metadata.height
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Ошибка при извлечении метаданных с помощью Sharp: ${error}`);
      return null;
    }
  }
  
  /**
   * Формирует имя файла, включая размеры
   * @param filename оригинальное имя файла
   * @param width ширина изображения
   * @param height высота изображения
   */
  static createFilenameWithDimensions(
    filename: string,
    width: number,
    height: number
  ): string {
    const ext = path.extname(filename);
    const basename = path.basename(filename, ext);
    
    return `${basename}_${width}x${height}${ext}`;
  }
  
  /**
   * Обновляет путь к файлу, добавляя информацию о размерах
   * @param filePath исходный путь к файлу
   * @param width ширина изображения
   * @param height высота изображения
   */
  static createPathWithDimensions(
    filePath: string,
    width: number,
    height: number
  ): string {
    const filename = path.basename(filePath);
    const ext = path.extname(filePath);
    const basename = path.basename(filename, ext);
    
    return `${basename}_${width}x${height}${ext}`;
  }
  
  /**
   * Извлекает размеры из имени файла
   * @param filename имя файла с размерами (example_800x600.jpg)
   */
  static extractDimensionsFromFilename(filename: string): {width: number, height: number} | null {
    const matches = filename.match(/(\d+)x(\d+)/i);
    
    if (matches && matches.length === 3) {
      const width = parseInt(matches[1], 10);
      const height = parseInt(matches[2], 10);
      
      if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
        return { width, height };
      }
    }
    
    return null;
  }
} 