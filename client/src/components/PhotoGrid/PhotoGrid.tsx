import React, { useState } from 'react';
import { Photo } from '../../types/photo.types';
import { ServerImage } from '../ServerImage/ServerImage';
import { PhotoViewer } from '../PhotoViewer/PhotoViewer';
import styles from './PhotoGrid.module.css';

interface PhotoGridProps {
    photos: Photo[];
    onPhotoDelete?: (photo: Photo) => void;
    canDelete?: boolean;
    isEditing?: boolean;
    isWallPost?: boolean;
    onPhotoClick?: (photo: Photo, index: number) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ 
    photos, 
    onPhotoDelete,
    canDelete = false,
    isEditing = false,
    isWallPost = false,
    onPhotoClick
}) => {
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

    const handlePhotoClick = (e: React.MouseEvent, photo: Photo, index: number) => {
        // Проверяем, что клик был не по кнопке удаления
        if (!(e.target as HTMLElement).closest(`.${styles.deleteButton}`)) {
            onPhotoClick?.(photo, index);
        }
    };

    const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
        e.stopPropagation(); // Предотвращаем открытие просмотрщика
        if (isEditing) {
            onPhotoDelete?.(photo);
            return;
        }

        // При удалении фото из просмотра запрашиваем подтверждение
        if (!window.confirm('Вы уверены, что хотите удалить эту фотографию?')) {
            return;
        }
        onPhotoDelete?.(photo);
    };

    // Количество дополнительных фотографий для отображения индикатора "+"
    const remainingPhotos = photos.length > 5 ? photos.length - 5 : 0;

    return (
        <div className={`${styles.photoGrid} ${getGridClassName()}`}>
            {photos.map((photo, index) => (
                <div 
                    key={photo.id} 
                    className={`${styles.photoWrapper}`}
                    onClick={(e) => handlePhotoClick(e, photo, index)}
                    data-remaining={remainingPhotos}
                >
                    <ServerImage
                        path={photo.path}
                        alt={photo.description || `Фото ${index + 1}`}
                        className={styles.photo}
                        isDeleted={photo.isDeleted}
                        extension={photo.extension}
                    />
                    {isEditing && canDelete && !photo.isDeleted && (
                        <button 
                            className={styles.deleteButton}
                            onClick={(e) => handleDelete(e, photo)}
                            title="Удалить фото"
                        />
                    )}
                </div>
            ))}
        </div>
    );
}; 