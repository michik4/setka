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
import { ImageUploader } from '../components/ImageUploader/ImageUploader';

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
    const [isUploading, setIsUploading] = useState(false);
    const [showUploader, setShowUploader] = useState(false);
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

    // Обработчик загрузки фотографий
    const handleImageUploaded = async (photo: Photo) => {
        if (!album || !albumId) return;
        
        try {
            // Обновляем локальное состояние альбома, добавляя новое фото
            setAlbum(prevAlbum => {
                if (!prevAlbum) return null;
                return {
                    ...prevAlbum,
                    photos: [...prevAlbum.photos, photo],
                    photosCount: prevAlbum.photos.length + 1
                };
            });
            
            // Запоминаем, что нужно обновить альбом с сервера
            // после всех загрузок
            setIsUploading(true);
            
        } catch (err) {
            console.error('Ошибка при добавлении фотографии в альбом:', err);
            alert('Не удалось добавить фотографию в альбом');
        }
    };

    // Обработка завершения всех загрузок
    const handleUploadComplete = async () => {
        try {
            // Обновляем альбом с сервера для получения актуальных данных
            const updatedAlbum = await api.get(`/albums/${albumId}`);
            setAlbum(updatedAlbum);
        } catch (error) {
            console.error('Ошибка при обновлении альбома:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleErrorUpload = (errorMessage: string) => {
        setError(errorMessage);
        setTimeout(() => setError(null), 3000);
    };

    const toggleUploader = () => {
        setShowUploader(!showUploader);
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
    const nonDeletedPhotos = album.photos.filter(photo => !photo.isDeleted);

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
                            {nonDeletedPhotos.length} {nonDeletedPhotos.length === 1 ? 'фотография' : 
                             nonDeletedPhotos.length > 1 && nonDeletedPhotos.length < 5 ? 'фотографии' : 'фотографий'}
                        </span>
                        {album.isPrivate && (
                            <span className={styles.private}>Приватный альбом</span>
                        )}
                    </div>
                </div>
                {canDelete && (
                    <div className={styles.headerActions}>
                        <button
                            className={styles.uploadButton}
                            onClick={toggleUploader}
                        >
                            {showUploader ? 'Отмена' : 'Загрузить фото'}
                        </button>
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
            
            {canDelete && showUploader && (
                <div className={styles.uploaderContainer}>
                    <h3 className={styles.uploaderTitle}>Загрузка фотографий в альбом</h3>
                    <ImageUploader 
                        onImageUploaded={handleImageUploaded}
                        onError={handleErrorUpload}
                        albumId={parseInt(albumId || '0')}
                        onUploadComplete={handleUploadComplete}
                    />
                    {isUploading && <div className={styles.uploadingStatus}>Загрузка фото...</div>}
                </div>
            )}
            
            {nonDeletedPhotos.length > 0 ? (
                <div className={styles.photosContainer}>
                    <div className={styles.photosGrid}>
                        {nonDeletedPhotos.map((photo, index) => (
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
                    allPhotos={nonDeletedPhotos}
                    currentIndex={selectedPhotoIndex || 0}
                    onPhotoChange={handlePhotoChange}
                />
            )}
        </div>
    );
}; 