import React, { useEffect, useState } from 'react';
import { Photo } from '../../types/post.types';
import styles from './ImageSelector.module.css';
import { API_URL } from '../../config';
import { ServerImage } from '../ServerImage/ServerImage';

interface ImageSelectorProps {
    userId: number;
    selectedImages: Photo[];
    onImagesChange: (images: Photo[]) => void;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({ userId, selectedImages, onImagesChange }) => {
    const [images, setImages] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
            
            console.log(`Server response status: ${response.status} ${response.statusText}`);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to fetch images: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('Fetched images:', data);
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

    const toggleImage = (image: Photo) => {
        const isSelected = selectedImages.some(selected => selected.id === image.id);
        if (isSelected) {
            onImagesChange(selectedImages.filter(selected => selected.id !== image.id));
        } else {
            onImagesChange([...selectedImages, image]);
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
                <div>{error}</div>
                <button className={styles.retryButton} onClick={fetchUserImages}>
                    Попробовать снова
                </button>
            </div>
        );
    }

    if (!images.length) {
        return (
            <div className={styles.empty}>
                У вас пока нет загруженных изображений
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.title}>Выберите изображения из галереи:</div>
            <div className={styles.grid}>
                {images.map(image => (
                    <div
                        key={image.id}
                        className={`${styles.imageWrapper} ${
                            selectedImages.some(selected => selected.id === image.id) ? styles.selected : ''
                        }`}
                        onClick={() => toggleImage(image)}
                    >
                        <ServerImage
                            imageId={image.id}
                            path={image.path}
                            className={styles.image}
                            alt={image.description || 'User image'}
                        />
                        <div className={styles.overlay}>
                            <span className={styles.checkmark}>✓</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}; 