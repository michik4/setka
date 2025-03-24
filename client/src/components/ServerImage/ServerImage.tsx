import React, { useState } from 'react';
import styles from './ServerImage.module.css';
import { Photo } from '../../types/post.types';
import { API_URL } from '../../config';

interface ServerImageProps {
    imageId: number;
    path?: string;
    alt?: string;
    className?: string;
    width?: number | string;
    height?: number | string;
    onLoad?: () => void;
    onError?: (error: Error) => void;
}

export const ServerImage: React.FC<ServerImageProps> = ({
    imageId,
    path,
    alt = '',
    className,
    width,
    height,
    onLoad,
    onError
}) => {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const handleLoad = () => {
        setIsLoading(false);
        onLoad?.();
    };

    const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setIsLoading(false);
        const error = new Error('Не удалось загрузить изображение');
        setError(error.message);
        onError?.(error);
    };

    // Формируем URL изображения
    const imageUrl = path 
        ? `${API_URL}/${path.replace(/\\/g, '/')}` // Заменяем обратные слеши на прямые
        : `${API_URL}/photos/${imageId}?file=true`;

    console.log('Загрузка изображения:', imageUrl); // Добавляем логирование

    if (error) {
        return (
            <div className={`${styles.error} ${className || ''}`}>
                <span role="img" aria-label="error">❌</span>
            </div>
        );
    }

    return (
        <div className={`${styles.container} ${className || ''}`}>
            {isLoading && (
                <div className={styles.loader}>
                    <div className={styles.spinner}></div>
                </div>
            )}
            <img
                src={imageUrl}
                alt={alt}
                className={`${styles.image} ${isLoading ? styles.loading : ''}`}
                style={{ width, height }}
                onLoad={handleLoad}
                onError={handleError}
            />
        </div>
    );
}; 