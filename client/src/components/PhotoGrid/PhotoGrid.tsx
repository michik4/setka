import React, { useState } from 'react';
import { Photo } from '../../types/post.types';
import { ServerImage } from '../ServerImage/ServerImage';
import { PhotoViewer } from '../PhotoViewer/PhotoViewer';
import styles from './PhotoGrid.module.css';

interface PhotoGridProps {
    photos: Photo[];
    onPhotoDelete?: (photo: Photo) => void;
    canDelete?: boolean;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ 
    photos, 
    onPhotoDelete,
    canDelete = false 
}) => {
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

    if (!photos.length) return null;

    const getGridClassName = () => {
        switch (photos.length) {
            case 1:
                return styles.singlePhoto;
            case 2:
                return styles.twoPhotos;
            case 3:
                return styles.threePhotos;
            case 4:
                return styles.fourPhotos;
            default:
                return styles.manyPhotos;
        }
    };

    const handlePhotoClick = (e: React.MouseEvent, photo: Photo) => {
        // Проверяем, что клик был не по меню
        if (!(e.target as HTMLElement).closest(`.${styles.photoMenu}`)) {
            setSelectedPhoto(photo);
        }
    };

    const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
        e.stopPropagation(); // Предотвращаем открытие просмотрщика
        if (window.confirm('Вы уверены, что хотите удалить это фото?')) {
            onPhotoDelete?.(photo);
        }
    };

    return (
        <>
            <div className={`${styles.photoGrid} ${getGridClassName()}`}>
                {photos.map((photo, index) => (
                    <div 
                        key={photo.id} 
                        className={`${styles.photoWrapper} ${index === 0 ? styles.firstPhoto : ''}`}
                        onClick={(e) => handlePhotoClick(e, photo)}
                    >
                        <ServerImage
                            path={photo.path}
                            alt={photo.description || `Фото ${index + 1}`}
                            className={styles.photo}
                        />
                        {canDelete && (
                            <div className={styles.photoMenu}>
                                <button 
                                    className={`${styles.menuButton} ${styles.deleteButton}`}
                                    onClick={(e) => handleDelete(e, photo)}
                                >
                                    🗑️ Удалить
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {selectedPhoto && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => setSelectedPhoto(null)}
                    onDelete={canDelete ? () => {
                        if (window.confirm('Вы уверены, что хотите удалить это фото?')) {
                            onPhotoDelete?.(selectedPhoto);
                            setSelectedPhoto(null);
                        }
                    } : undefined}
                    canDelete={canDelete}
                />
            )}
        </>
    );
}; 