import React from 'react';
import { Photo } from '../../types/post.types';
import { ServerImage } from '../ServerImage/ServerImage';
import { api } from '../../utils/api';
import styles from './PhotoViewer.module.css';

interface PhotoViewerProps {
    photo: Photo;
    onClose: () => void;
    onDelete?: () => void;
    canDelete?: boolean;
    isWallPost?: boolean;
    allPhotos?: Photo[];
    currentIndex?: number;
    onPhotoChange?: (photo: Photo) => void;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ 
    photo, 
    onClose, 
    onDelete,
    canDelete = false,
    isWallPost = false,
    allPhotos,
    currentIndex,
    onPhotoChange
}) => {
    const handleDelete = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить эту фотографию?')) {
            return;
        }

        try {
            onClose();
            if (onDelete) {
                onDelete();
            }
        } catch (error) {
            console.error('Ошибка при удалении фотографии:', error);
            alert('Не удалось удалить фотографию');
        }
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handlePrevPhoto = () => {
        if (allPhotos && currentIndex !== undefined && currentIndex > 0) {
            onPhotoChange?.(allPhotos[currentIndex - 1]);
        }
    };

    const handleNextPhoto = () => {
        if (allPhotos && currentIndex !== undefined && currentIndex < allPhotos.length - 1) {
            onPhotoChange?.(allPhotos[currentIndex + 1]);
        }
    };

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft') {
                handlePrevPhoto();
            } else if (e.key === 'ArrowRight') {
                handleNextPhoto();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose, handlePrevPhoto, handleNextPhoto]);

    return (
        <div className={styles.photoViewer} onClick={handleBackgroundClick}>
            <button className={styles.closeButton} onClick={onClose}>
                ✕
            </button>
            <div className={styles.photoContainer}>
                <ServerImage
                    path={photo.path}
                    alt={photo.description || 'Фото'}
                    className={styles.photo}
                    isDeleted={photo.isDeleted}
                    extension={photo.extension}
                />
                <div className={styles.photoMenu}>
                    {canDelete && !photo.isDeleted && (
                        <button 
                            className={`${styles.menuButton} ${styles.deleteButton}`}
                            onClick={handleDelete}
                        >
                            🗑️ Удалить
                        </button>
                    )}
                    {!photo.isDeleted && (
                        <button 
                            className={styles.menuButton}
                            onClick={() => window.open(photo.path, '_blank')}
                        >
                            🔍 Открыть оригинал
                        </button>
                    )}
                </div>
                {allPhotos && currentIndex !== undefined && (
                    <>
                        <button 
                            className={`${styles.navButton} ${styles.prevButton}`}
                            onClick={handlePrevPhoto}
                            disabled={currentIndex === 0}
                        >
                            ←
                        </button>
                        <button 
                            className={`${styles.navButton} ${styles.nextButton}`}
                            onClick={handleNextPhoto}
                            disabled={currentIndex === allPhotos.length - 1}
                        >
                            →
                        </button>
                        <div className={styles.photoCounter}>
                            {currentIndex + 1} / {allPhotos.length}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}; 