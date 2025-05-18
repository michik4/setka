import React from 'react';
import { Photo } from '../../types/post.types';
import { Album } from '../../types/album.types';
import { ServerImage } from '../ServerImage/ServerImage';
import { Link, useNavigate } from 'react-router-dom';
import styles from './AlbumGrid.module.css';

interface AlbumGridProps {
    album: Album;
    onClick?: () => void;
}

export const AlbumGrid: React.FC<AlbumGridProps> = ({ album, onClick }) => {
    const navigate = useNavigate();
    const MAX_DISPLAY_PHOTOS = 5;

    // Фильтруем неудаленные фото для отображения
    const displayPhotos = album.photos
        .filter(photo => !photo.isDeleted)
        .slice(0, MAX_DISPLAY_PHOTOS);

    // Определяем, сколько дополнительных фото есть в альбоме
    const remainingPhotos = Math.max(0, album.photosCount - MAX_DISPLAY_PHOTOS);

    const handleAlbumClick = () => {
        if (onClick) {
            onClick();
        } else {
            navigate(`/albums/${album.id}`);
        }
    };

    // Определяем класс сетки в зависимости от количества фотографий
    const getGridClassName = () => {
        switch (displayPhotos.length) {
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

    if (displayPhotos.length === 0) {
        return null;
    }

    return (
        <div className={styles.albumContainer}>
            <div
                className={styles.albumHeader}
            >
                <Link to={`/albums/${album.id}`} className={styles.albumLink}>
                    <div className={styles.albumTitle}>
                        {album.title}
                    </div>
                </Link>
                <div className={styles.albumCount}>{album.photosCount} фото</div>
            </div>

            <div
                className={`${styles.photoGrid} ${getGridClassName()}`}
                onClick={handleAlbumClick}
            >
                {displayPhotos.map((photo, index) => (
                    <div
                        key={photo.id}
                        className={`${styles.photoWrapper} ${index === displayPhotos.length - 1 && remainingPhotos > 0 ? styles.lastPhoto : ''}`}
                    >
                        <ServerImage
                            path={photo.path}
                            alt={photo.description || `Фото ${index + 1}`}
                            className={styles.photo}
                            isDeleted={photo.isDeleted}
                            extension={photo.extension}
                        />

                        {/* Показываем индикатор "+" на последней фотографии, если есть еще фото */}
                        {index === displayPhotos.length - 1 && remainingPhotos > 0 && (
                            <div className={styles.morePhotos}>
                                +{remainingPhotos}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}; 