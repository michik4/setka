import React, { useEffect, useState } from 'react';
import { Photo } from '../../types/post.types';
import styles from './ImageSelector.module.css';
import { API_URL } from '../../config';
import { ServerImage } from '../ServerImage/ServerImage';
import { PhotoViewer } from '../PhotoViewer/PhotoViewer';
import { api } from '../../utils/api';

interface ImageSelectorProps {
    userId: number;
    selectedImages: Photo[];
    onImagesChange: (images: Photo[]) => void;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({ userId, selectedImages, onImagesChange }) => {
    const [images, setImages] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isPreviewMode, setIsPreviewMode] = useState(false);

    const fetchUserImages = async () => {
        if (typeof userId !== 'number') {
            console.log('Invalid userId provided to ImageSelector');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            console.log(`Fetching images for user ${userId}`);
            const response = await fetch(`${API_URL}/photos/user/${userId}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to fetch images: ${response.statusText}`);
            }

            const data = await response.json();
            setImages(data);
        } catch (err) {
            console.error('Error fetching images:', err);
            setError(err instanceof Error ? err.message : 'Failed to load images');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserImages();
    }, [userId]);

    const handleImageClick = (image: Photo, e: React.MouseEvent) => {
        e.preventDefault(); // Предотвращаем стандартное поведение

        // Если зажат Ctrl или нажата правая кнопка мыши - открываем просмотр
        if (e.ctrlKey || e.button === 2) {
            setSelectedPhoto(image);
            setIsPreviewMode(true);
            return;
        }

        // Иначе переключаем выбор фотографии
        const isSelected = selectedImages.some(selected => selected.id === image.id);
        if (isSelected) {
            onImagesChange(selectedImages.filter(selected => selected.id !== image.id));
        } else {
            onImagesChange([...selectedImages, image]);
        }
    };

    const handlePhotoDelete = async (photo: Photo) => {
        try {
            await api.delete(`/photos/${photo.id}`);
            setImages(prevImages => prevImages.filter(img => img.id !== photo.id));
            onImagesChange(selectedImages.filter(img => img.id !== photo.id));
            setSelectedPhoto(null);
            setIsPreviewMode(false);
        } catch (err) {
            console.error('Ошибка при удалении фотографии:', err);
            alert('Не удалось удалить фотографию');
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <div>Загрузка изображений...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <div>Ошибка: {error}</div>
                <button onClick={fetchUserImages} className={styles.retryButton}>
                    Попробовать снова
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Ваши фотографии</h3>
                <div className={styles.info}>
                    Выбрано: {selectedImages.length}
                    {selectedImages.length > 0 && (
                        <button
                            className={styles.clearButton}
                            onClick={() => onImagesChange([])}
                        >
                            Очистить
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.grid} onContextMenu={e => e.preventDefault()}>
                {images.map(image => (
                    <div
                        key={image.id}
                        className={`${styles.imageWrapper} ${
                            selectedImages.some(selected => selected.id === image.id)
                                ? styles.selected
                                : ''
                        }`}
                        onClick={(e) => handleImageClick(image, e)}
                        onContextMenu={(e) => handleImageClick(image, e)}
                    >
                        <ServerImage
                            path={image.path}
                            alt={image.description || 'Фотография'}
                            className={styles.image}
                        />
                        <div className={styles.overlay}>
                            <span className={styles.checkmark}>✓</span>
                        </div>
                    </div>
                ))}
            </div>

            {selectedPhoto && isPreviewMode && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => {
                        setSelectedPhoto(null);
                        setIsPreviewMode(false);
                    }}
                    onDelete={() => handlePhotoDelete(selectedPhoto)}
                    canDelete={true}
                />
            )}
        </div>
    );
}; 