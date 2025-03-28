import React, { useEffect } from 'react';
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
}

export const ServerImage: React.FC<ServerImageProps> = ({ 
    imageId, 
    path, 
    src, 
    alt, 
    className,
    isDeleted,
    extension 
}) => {
    // Формируем URL изображения
    let imageSrc = '';
    if (src) {
        imageSrc = src;
        console.log('[ServerImage] Используем прямой src:', imageSrc);
    } else if (imageId) {
        imageSrc = `${API_URL}/photos/${imageId}?file=true`;
        console.log('[ServerImage] Используем imageId:', imageSrc);
    } else if (path) {
        if (path.startsWith('http')) {
            imageSrc = path;
            console.log('[ServerImage] Используем внешний URL:', imageSrc);
        } else if (path.startsWith('placeholder_')) {
            imageSrc = `${API_URL}/temp/${path}`;
            console.log('[ServerImage] Используем временный файл:', imageSrc);
        } else {
            imageSrc = `${API_URL}/photos/file/${path}`;
            console.log('[ServerImage] Используем файл из photos:', imageSrc);
        }
    }

    useEffect(() => {
        if (imageSrc) {
            console.log('[ServerImage] Попытка загрузки изображения:', {
                imageSrc,
                isDeleted,
                extension,
                path,
                imageId
            });
        }

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
    }, [imageSrc, isDeleted, extension, path, imageId]);

    if (!imageSrc || isDeleted) {
        console.log('[ServerImage] Показываем плейсхолдер:', {
            reason: !imageSrc ? 'нет источника' : 'фото удалено',
            isDeleted,
            extension,
            path,
            imageId
        });
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

    return (
        <img 
            src={imageSrc} 
            alt={alt}
            className={`${styles.image} ${className || ''}`}
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
};