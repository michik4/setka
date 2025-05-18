import React, { useEffect, useState, forwardRef } from 'react';
import { API_URL } from '../../config';
import styles from './ServerImage.module.css';

interface ServerImageProps {
    imageId?: number;
    path?: string;
    src?: string;
    alt: string;
    className?: string;
    isDeleted?: boolean;
    extension?: string;
    forceCachedImage?: boolean;
    onLoad?: () => void;
    fallback?: string;
    userId?: number;
    groupId?: number;
    isAvatar?: boolean;
}

// Глобальный кэш для предзагруженных изображений
const imageCache: Record<string, HTMLImageElement> = {};
const erroredImages: Record<string, boolean> = {};

// Используем правильное именование для forwardRef
const ServerImage = forwardRef<HTMLImageElement, ServerImageProps>(({ 
    imageId, 
    path, 
    src, 
    alt, 
    className,
    isDeleted,
    extension,
    forceCachedImage = false,
    onLoad,
    fallback,
    userId,
    groupId,
    isAvatar
}, ref) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    // Формируем URL изображения - вычисление при каждом рендере, но без setState
    let imageSrc = '';
    if (src) {
        imageSrc = src;
    } else if (userId && isAvatar) {
        imageSrc = `${API_URL}/users/${userId}/avatar`;
    } else if (groupId && isAvatar) {
        imageSrc = `${API_URL}/groups/${groupId}/avatar`;
    } else if (imageId) {
        imageSrc = `${API_URL}/photos/${imageId}?file=true`;
    } else if (path) {
        if (path.startsWith('http')) {
            // Внешний URL (например, https://example.com/image.jpg)
            imageSrc = path;
        } else if (path.startsWith('placeholder_')) {
            // Временные файлы
            imageSrc = `${API_URL}/temp/${path}`;
        } else if (path.startsWith('/api/')) {
            // Уже полный относительный путь API (например, /api/music/cover/default.png)
            // Исправлена ошибка: теперь не добавляем /api/ дважды
            const apiPath = path.startsWith('/api') ? path : `/api${path}`;
            imageSrc = `${API_URL.replace('/api', '')}${apiPath}`;
        } else {
            // Стандартные фотографии
            imageSrc = `${API_URL}/photos/file/${path}`;
        }
    }
    
    // Проверяем ошибочные изображения при первом рендере
    useEffect(() => {
        // Проверяем, была ли ошибка загрузки этого изображения ранее
        if (imageSrc && erroredImages[imageSrc] && !imageError) {
            setImageError(true);
        }
    }, [imageSrc, imageError]);

    // Предзагрузка изображения
    useEffect(() => {
        if (!imageSrc || imageCache[imageSrc]) {
            // Если нет URL или изображение уже в кэше
            if (imageSrc && imageCache[imageSrc]) {
                setImageLoaded(true);
                onLoad?.();
            }
            return;
        }
        
        // Если изображение уже помечено как ошибочное, не загружаем его снова
        if (erroredImages[imageSrc]) {
            setImageError(true);
            return;
        }

        const img = new Image();
        img.src = imageSrc;
        
        img.onload = () => {
            imageCache[imageSrc] = img;
            setImageLoaded(true);
            setImageError(false);
            onLoad?.();
        };
        
        img.onerror = (error) => {
            erroredImages[imageSrc] = true;
            setImageError(true);
            console.error('[ServerImage] Ошибка предзагрузки изображения:', {
                imageSrc,
                error,
                path,
                imageId
            });
        };
        
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [imageSrc, onLoad]);

    // Если нет URL или есть ошибка загрузки и нет fallback, показываем дефолтную заглушку
    if (!imageSrc || (imageError && !fallback)) {
        return (
            <div className={`${styles.defaultImage} ${className || ''}`}>
                <span>{alt.split(' ').map(word => word[0] || '').join('').toUpperCase()}</span>
            </div>
        );
    }

    // Если есть ошибка загрузки и задан fallback, показываем fallback
    if (imageError && fallback) {
        return (
            <img 
                ref={ref}
                src={fallback} 
                alt={alt}
                className={`${styles.image} ${className || ''} ${styles.loaded}`}
                onError={(e) => {
                    console.warn('[ServerImage] Ошибка загрузки fallback изображения:', fallback);
                }}
            />
        );
    }

    // Если forceCachedImage=true и у нас есть кэшированное изображение,
    // и если оно загружено, добавляем класс loaded сразу
    const isCached = forceCachedImage && imageCache[imageSrc];
    const imageClassName = `${styles.image} ${className || ''} ${(imageLoaded || isCached) ? styles.loaded : ''}`;

    return (
        <img 
            ref={ref}
            src={imageSrc} 
            alt={alt}
            className={imageClassName}
            onLoad={() => {
                setImageLoaded(true);
                setImageError(false);
                onLoad?.();
            }}
            onError={(e) => {
                console.error('[ServerImage] Ошибка загрузки изображения:', {
                    imageSrc,
                    error: e,
                    path,
                    imageId
                });
                erroredImages[imageSrc] = true;
                setImageError(true);
            }}
        />
    );
});

// Устанавливаем отображаемое имя компонента для отладки
ServerImage.displayName = 'ServerImage';

// Экспортируем компонент
export { ServerImage };