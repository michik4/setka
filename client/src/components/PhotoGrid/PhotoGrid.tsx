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
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

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
            setSelectedPhoto(photo);
            setSelectedPhotoIndex(index);
            onPhotoClick?.(photo, index);
        }
    };

    const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
        e.stopPropagation(); // Предотвращаем открытие просмотрщика
        if (!window.confirm('Вы уверены, что хотите удалить эту фотографию?')) {
            return;
        }
        onPhotoDelete?.(photo);
    };

    const handlePhotoChange = (photo: Photo) => {
        setSelectedPhoto(photo);
        const index = photos.findIndex(p => p.id === photo.id);
        setSelectedPhotoIndex(index);
    };

    return (
        <>
            <div className={`${styles.photoGrid} ${getGridClassName()}`}>
                {photos.map((photo, index) => (
                    <div 
                        key={photo.id} 
                        className={`${styles.photoWrapper} ${index === 0 ? styles.firstPhoto : ''}`}
                        onClick={(e) => handlePhotoClick(e, photo, index)}
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

            {selectedPhoto && !selectedPhoto.isDeleted && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => {
                        setSelectedPhoto(null);
                        setSelectedPhotoIndex(null);
                    }}
                    onDelete={canDelete ? () => {
                        onPhotoDelete?.(selectedPhoto);
                        setSelectedPhoto(null);
                        setSelectedPhotoIndex(null);
                    } : undefined}
                    canDelete={canDelete}
                    isWallPost={isWallPost}
                    allPhotos={photos}
                    currentIndex={selectedPhotoIndex || 0}
                    onPhotoChange={handlePhotoChange}
                />
            )}
        </>
    );
}; 