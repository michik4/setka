import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Album } from '../types/album.types';
import { Photo } from '../types/photo.types';
import { ServerImage } from '../components/ServerImage/ServerImage';
import { PhotoViewer } from '../components/PhotoViewer/PhotoViewer';
import { Spinner } from '../components/Spinner/Spinner';
import { useAuth } from '../contexts/AuthContext';
import styles from './AlbumPage.module.css';
import { api } from '../utils/api';

export const AlbumPage: React.FC = () => {
    const { albumId } = useParams<{ albumId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [album, setAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const isAuthor = user?.id === album?.userId;

    useEffect(() => {
        const fetchAlbum = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get(`/albums/${albumId}`);
                setAlbum(response);
            } catch (err) {
                console.error('Ошибка при загрузке альбома:', err);
                setError('Не удалось загрузить альбом');
            } finally {
                setLoading(false);
            }
        };

        if (albumId) {
            fetchAlbum();
        }
    }, [albumId]);

    const handlePhotoClick = (photo: Photo, index: number) => {
        setSelectedPhoto(photo);
        setSelectedPhotoIndex(index);
    };

    const handlePhotoChange = (photo: Photo) => {
        if (!album) return;
        setSelectedPhoto(photo);
        const index = album.photos.findIndex(p => p.id === photo.id);
        setSelectedPhotoIndex(index);
    };

    const handleDeleteAlbum = async () => {
        if (!album || !user || album.userId !== user.id) return;

        if (!window.confirm('Вы уверены, что хотите удалить этот альбом?')) {
            return;
        }

        try {
            setIsDeleting(true);
            await api.delete(`/albums/${album.id}`);
            navigate(-1);
        } catch (err) {
            console.error('Ошибка при удалении альбома:', err);
            setError('Не удалось удалить альбом');
            setIsDeleting(false);
        }
    };

    const handlePhotoDelete = async (photo: Photo) => {
        try {
            await api.delete(`/photos/${photo.id}`);
            
            // Обновляем список фотографий в альбоме после удаления
            if (album) {
                setAlbum({
                    ...album,
                    photos: album.photos.filter(p => p.id !== photo.id),
                    photosCount: album.photos.filter(p => p.id !== photo.id).length
                });
            }
            setSelectedPhoto(null);
        } catch (err) {
            console.error('Ошибка при удалении фотографии:', err);
            alert('Не удалось удалить фотографию');
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <Spinner />
            </div>
        );
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!album) {
        return <div className={styles.error}>Альбом не найден</div>;
    }

    const canDelete = user && album.userId === user.id;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <h1 className={styles.title}>{album.title}</h1>
                    {album.description && (
                        <p className={styles.description}>{album.description}</p>
                    )}
                    <div className={styles.info}>
                        <span className={styles.count}>
                            {album.photos.filter(photo => !photo.isDeleted).length} {album.photos.filter(photo => !photo.isDeleted).length === 1 ? 'фотография' : 
                             album.photos.filter(photo => !photo.isDeleted).length > 1 && album.photos.filter(photo => !photo.isDeleted).length < 5 ? 'фотографии' : 'фотографий'}
                        </span>
                        {album.isPrivate && (
                            <span className={styles.private}>Приватный альбом</span>
                        )}
                    </div>
                </div>
                {canDelete && (
                    <div className={styles.headerActions}>
                        <button
                            className={styles.deleteButton}
                            onClick={handleDeleteAlbum}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Удаление...' : 'Удалить альбом'}
                        </button>
                    </div>
                )}
            </div>
            
            {album.photos && album.photos.filter(photo => !photo.isDeleted).length > 0 ? (
                <div className={styles.photosContainer}>
                    <div className={styles.photosGrid}>
                        {album.photos.filter(photo => !photo.isDeleted).map((photo, index) => (
                            <div 
                                key={photo.id} 
                                className={styles.photoItem}
                                onClick={() => handlePhotoClick(photo, index)}
                                role="button"
                                tabIndex={0}
                            >
                                <ServerImage 
                                    path={photo.path} 
                                    alt={photo.description || 'Фото'} 
                                />
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className={styles.empty}>В альбоме пока нет фотографий</div>
            )}

            {selectedPhoto && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => {
                        setSelectedPhoto(null);
                        setSelectedPhotoIndex(null);
                    }}
                    onDelete={isAuthor ? () => handlePhotoDelete(selectedPhoto) : undefined}
                    canDelete={isAuthor}
                    allPhotos={album.photos.filter(photo => !photo.isDeleted)}
                    currentIndex={selectedPhotoIndex || 0}
                    onPhotoChange={handlePhotoChange}
                />
            )}
        </div>
    );
}; 