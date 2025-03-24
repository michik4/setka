import React from 'react';
import { Photo } from '../../types/post.types';
import { ServerImage } from '../ServerImage/ServerImage';
import styles from './PhotoGrid.module.css';

interface PhotoGridProps {
    photos: Photo[];
    onPhotoClick?: (photo: Photo) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({ photos, onPhotoClick }) => {
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

    const handleClick = (photo: Photo) => {
        if (onPhotoClick) {
            onPhotoClick(photo);
        }
    };

    return (
        <div className={`${styles.photoGrid} ${getGridClassName()}`}>
            {photos.map((photo, index) => (
                <div 
                    key={photo.id} 
                    className={`${styles.photoWrapper} ${index === 0 ? styles.firstPhoto : ''}`}
                    onClick={() => handleClick(photo)}
                >
                    <ServerImage
                        imageId={photo.id}
                        path={photo.path}
                        alt={photo.description || `Фото ${index + 1}`}
                        className={styles.photo}
                    />
                </div>
            ))}
        </div>
    );
}; 