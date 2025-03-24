import React from 'react';
import { Photo } from '../../types/post.types';
import { ServerImage } from '../ServerImage/ServerImage';
import styles from './PhotoViewer.module.css';

interface PhotoViewerProps {
    photo: Photo;
    onClose: () => void;
    onDelete?: () => void;
    canDelete?: boolean;
}

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ 
    photo, 
    onClose, 
    onDelete,
    canDelete = false 
}) => {
    const handleDelete = async () => {
        if (window.confirm('Вы уверены, что хотите удалить это фото?')) {
            onDelete?.();
            onClose();
        }
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    React.useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

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
                />
                <div className={styles.photoMenu}>
                    {canDelete && (
                        <button 
                            className={`${styles.menuButton} ${styles.deleteButton}`}
                            onClick={handleDelete}
                        >
                            🗑️ Удалить
                        </button>
                    )}
                    <button 
                        className={styles.menuButton}
                        onClick={() => window.open(photo.path, '_blank')}
                    >
                        🔍 Открыть оригинал
                    </button>
                </div>
            </div>
        </div>
    );
}; 