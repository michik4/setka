import React, { useState } from 'react';
import { API_URL } from '../../config';
import styles from './ServerImage.module.css';

interface ServerImageProps {
    imageId?: number;
    path?: string;
    src?: string;
    alt: string;
    className?: string;
}

export const ServerImage: React.FC<ServerImageProps> = ({ imageId, path, src, alt, className }) => {
    const [hasError, setHasError] = useState(false);

    // Формируем URL изображения
    let imageSrc = '';
    if (src) {
        imageSrc = src;
    } else if (imageId) {
        imageSrc = `${API_URL}/photos/${imageId}?file=true`;
    } else if (path) {
        if (path.startsWith('http')) {
            imageSrc = path;
        } else {
            // Путь к файлу через эндпоинт /photos/file/
            imageSrc = `${API_URL}/photos/file/${path}`;
        }
    }

    console.log('ServerImage props:', { imageId, path, src, alt });
    console.log('Constructed image URL:', imageSrc);

    if (hasError || !imageSrc) {
        return (
            <div className={`${styles.defaultImage} ${className || ''}`}>
                <span>{alt.split(' ').map(word => word[0]).join('').toUpperCase()}</span>
            </div>
        );
    }

    return (
        <img 
            src={imageSrc} 
            alt={alt}
            className={`${styles.image} ${className || ''}`}
            onError={(e) => {
                console.error('Ошибка загрузки изображения:', {
                    src: imageSrc,
                    originalProps: { imageId, path, src }
                });
                setHasError(true);
            }}
        />
    );
};