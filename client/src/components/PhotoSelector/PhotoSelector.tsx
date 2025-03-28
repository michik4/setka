import React, { useState, useEffect } from 'react';
import { Photo } from '../../types/post.types';
import { Album } from '../../types/album.types';
import { ServerImage } from '../ServerImage/ServerImage';
import { api } from '../../utils/api';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import styles from './PhotoSelector.module.css';

interface PhotoSelectorProps {
    userId: number;
    onSelect: (photos: Photo[], albums: Album[]) => void;
    onCancel: () => void;
    multiple?: boolean;
}

export const PhotoSelector: React.FC<PhotoSelectorProps> = ({
    userId,
    onSelect,
    onCancel,
    multiple = false
}) => {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
    const [selectedAlbums, setSelectedAlbums] = useState<Album[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showUploader, setShowUploader] = useState(false);

    useEffect(() => {
        const fetchAlbums = async () => {
            try {
                console.log('Fetching albums for user:', userId);
                const response = await api.get(`/albums/user/${userId}`);
                console.log('Albums response:', response);
                
                if (Array.isArray(response)) {
                    // Убедимся, что у каждого альбома есть массив photos
                    const albumsWithPhotos = response.map((album: Album) => ({
                        ...album,
                        photos: album.photos || []
                    }));
                    console.log('Processed albums:', albumsWithPhotos);
                    setAlbums(albumsWithPhotos);
                } else {
                    console.log('Invalid response format:', response);
                    setError('Неверный формат ответа от сервера');
                    setAlbums([]);
                }
            } catch (err) {
                console.error('Ошибка при загрузке альбомов:', err);
                setError('Не удалось загрузить альбомы');
            } finally {
                setIsLoading(false);
            }
        };

        if (userId) {
            fetchAlbums();
        } else {
            console.error('No userId provided');
            setError('ID пользователя не указан');
            setIsLoading(false);
        }
    }, [userId]);

    const handlePhotoClick = (photo: Photo) => {
        if (!multiple) {
            setSelectedPhotos([photo]);
            setSelectedAlbums([]);
            return;
        }

        setSelectedPhotos(prev => {
            const isSelected = prev.some(p => p.id === photo.id);
            if (isSelected) {
                return prev.filter(p => p.id !== photo.id);
            }
            return [...prev, photo];
        });
    };

    const handleAlbumClick = (album: Album) => {
        if (!multiple) {
            setSelectedAlbums([album]);
            setSelectedPhotos([]);
            return;
        }

        setSelectedAlbums(prev => {
            const isSelected = prev.some(a => a.id === album.id);
            if (isSelected) {
                return prev.filter(a => a.id !== album.id);
            }
            return [...prev, album];
        });
    };

    const handleConfirm = () => {
        onSelect(selectedPhotos, selectedAlbums);
    };

    const handleImageUploaded = async (photo: Photo) => {
        try {
            // Находим альбом "Загруженное"
            const uploadAlbum = albums.find(album => album.title === 'Загруженное');
            
            if (uploadAlbum) {
                console.log('Добавляем фото в альбом "Загруженное":', { 
                    photoId: photo.id, 
                    albumId: uploadAlbum.id 
                });

                // Добавляем фото в альбом
                await api.post(`/albums/${uploadAlbum.id}/photos`, {
                    photoIds: [photo.id]
                });

                // Обновляем список фотографий
                setPhotos(prev => [photo, ...prev]);
                
                if (!multiple) {
                    onSelect([photo], []);
                } else {
                    setSelectedPhotos(prev => [...prev, photo]);
                }
            } else {
                console.error('Альбом "Загруженное" не найден');
            }
        } catch (err) {
            console.error('Ошибка при добавлении фото в альбом:', err);
            setError('Не удалось добавить фото в альбом');
        }
        setShowUploader(false);
    };

    const handleUploadError = (error: string) => {
        setError(error);
        setShowUploader(false);
    };

    if (isLoading) {
        return (
            <div className={styles.selector}>
                <div className={styles.loading}>
                    Загрузка...
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.selector}>
                <div className={styles.error}>
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Выберите фотографии или альбомы</h2>
                <div className={styles.headerControls}>
                    <button
                        type="button"
                        className={styles.uploadButton}
                        onClick={() => setShowUploader(true)}
                    >
                        Загрузить фото
                    </button>
                    <button
                        className={styles.closeButton}
                        onClick={onCancel}
                        title="Закрыть"
                    >
                        ×
                    </button>
                </div>
            </div>

            {showUploader && (
                <div className={styles.uploaderContainer}>
                    <ImageUploader
                        onImageUploaded={handleImageUploaded}
                        onError={handleUploadError}
                    />
                </div>
            )}

            <div className={styles.selector}>
                {albums.length > 0 && (
                    <div className={styles.section}>
                        <h4 className={styles.sectionTitle}>Альбомы</h4>
                        <div className={styles.albumsGrid}>
                            {albums.map(album => (
                                <div
                                    key={album.id}
                                    className={`${styles.albumItem} ${
                                        selectedAlbums.some(a => a.id === album.id) ? styles.selected : ''
                                    }`}
                                    onClick={() => handleAlbumClick(album)}
                                >
                                    <div className={styles.albumPreview}>
                                        {album.photos.length > 0 && (
                                            <ServerImage
                                                path={album.photos[album.photos.length - 1].path}
                                                alt={album.title}
                                            />
                                        )}
                                        <div className={styles.checkbox}>
                                            {selectedAlbums.some(a => a.id === album.id) && (
                                                <span className={styles.checkmark}>✓</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.albumInfo}>
                                        <div className={styles.albumTitle}>{album.title}</div>
                                        <div className={styles.albumCount}>{album.photosCount} фото</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {albums.map(album => album.photos && album.photos.length > 0 && (
                    <div key={album.id} className={styles.section}>
                        <h4 className={styles.sectionTitle}>{album.title}</h4>
                        <div className={styles.photosGrid}>
                            {album.photos.map(photo => (
                                <div
                                    key={photo.id}
                                    className={`${styles.photoItem} ${
                                        selectedPhotos.some(p => p.id === photo.id) ? styles.selected : ''
                                    }`}
                                    onClick={() => handlePhotoClick(photo)}
                                >
                                    <ServerImage
                                        path={photo.path}
                                        alt={photo.description || 'Фото'}
                                    />
                                    <div className={styles.checkbox}>
                                        {selectedPhotos.some(p => p.id === photo.id) && (
                                            <span className={styles.checkmark}>✓</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <div className={styles.footer}>
                    <button
                        className={styles.cancelButton}
                        onClick={onCancel}
                    >
                        Отмена
                    </button>
                    <button
                        className={styles.confirmButton}
                        onClick={handleConfirm}
                        disabled={selectedPhotos.length === 0 && selectedAlbums.length === 0}
                    >
                        {selectedPhotos.length > 0 && `Выбрано фото: ${selectedPhotos.length}`}
                        {selectedPhotos.length > 0 && selectedAlbums.length > 0 && ', '}
                        {selectedAlbums.length > 0 && `Выбрано альбомов: ${selectedAlbums.length}`}
                        {selectedPhotos.length === 0 && selectedAlbums.length === 0 && 'Выбрать'}
                    </button>
                </div>
            </div>
        </div>
    );
}; 