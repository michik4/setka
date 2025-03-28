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
}

// Глобальный кэш для предзагруженных изображений
const imageCache: Record<string, HTMLImageElement> = {};

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
    onLoad
}, ref) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    
    // Формируем URL изображения
    let imageSrc = '';
    if (src) {
        imageSrc = src;
    } else if (imageId) {
        imageSrc = `${API_URL}/photos/${imageId}?file=true`;
    } else if (path) {
        if (path.startsWith('http')) {
            imageSrc = path;
        } else if (path.startsWith('placeholder_')) {
            imageSrc = `${API_URL}/temp/${path}`;
        } else {
            imageSrc = `${API_URL}/photos/file/${path}`;
        }
    }

    // Предзагрузка изображения
    useEffect(() => {
        if (imageSrc && !isDeleted && !imageCache[imageSrc]) {
            const img = new Image();
            img.src = imageSrc;
            
            img.onload = () => {
                imageCache[imageSrc] = img;
                setImageLoaded(true);
                onLoad?.();
            };
            
            img.onerror = (error) => {
                console.error('[ServerImage] Ошибка предзагрузки изображения:', {
                    imageSrc,
                    error,
                    isDeleted,
                    extension,
                    path,
                    imageId
                });
            };
            
            return () => {
                img.onload = null;
                img.onerror = null;
            };
        } else if (imageCache[imageSrc]) {
            // Если изображение уже в кэше, просто отмечаем как загруженное
            setImageLoaded(true);
            onLoad?.();
        }
    }, [imageSrc, isDeleted, imageId, extension, path, onLoad]);

    useEffect(() => {
        // Добавляем обработчик для очистки временных файлов при закрытии вкладки
        const handleBeforeUnload = () => {
            if (path?.startsWith('placeholder_')) {
                // Отправляем запрос на очистку временных файлов
                fetch(`${API_URL}/auth/cleanup-temp`, {
                    method: 'POST',
                    credentials: 'include',
                    keepalive: true // Важно для завершения запроса даже при закрытии вкладки
                }).catch(console.error);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [path]);

    if (!imageSrc || isDeleted) {
        return (
            <div className={`${styles.defaultImage} ${className || ''}`}>
                {isDeleted ? (
                    <div className={styles.deletedImage}>
                        <span className={styles.extension}>{extension}</span>
                        <span className={styles.message}>Фотография была удалена</span>
                    </div>
                ) : (
                    <span>{alt.split(' ').map(word => word[0]).join('').toUpperCase()}</span>
                )}
            </div>
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
                onLoad?.();
            }}
            onError={(e) => {
                console.error('[ServerImage] Ошибка загрузки изображения:', {
                    imageSrc,
                    error: e,
                    isDeleted,
                    extension,
                    path,
                    imageId
                });
            }}
        />
    );
});

// Устанавливаем отображаемое имя компонента для отладки
ServerImage.displayName = 'ServerImage';

// Экспортируем компонент
export { ServerImage };