import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo } from '../../types/photo.types';
import { Album } from '../../types/album.types';
import { ServerImage } from '../ServerImage/ServerImage';
import { PhotoViewer } from '../PhotoViewer/PhotoViewer';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import styles from './Showcase.module.css';

interface ShowcaseProps {
    userId: string;
}

type Tab = 'photos';

export const Showcase: React.FC<ShowcaseProps> = ({ userId }) => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('photos');
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [uploadedPhotoIds, setUploadedPhotoIds] = useState<number[]>([]);
    const isAuthor = currentUser?.id === parseInt(userId);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                const [photosResponse, albumsResponse] = await Promise.all([
                    api.get(`/photos/user/${userId}`),
                    api.get(`/albums/user/${userId}`)
                ]);

                // Находим альбом "Загруженное"
                const uploadedAlbum = albumsResponse?.find((album: Album) => album.title === 'Загруженное');
                const uploadedIds = uploadedAlbum ? uploadedAlbum.photos.map((photo: Photo) => photo.id) : [];
                setUploadedPhotoIds(uploadedIds);

                // Фильтруем фотографии, исключая те, что находятся в альбоме "Загруженное" и удаленные
                const filteredPhotos = photosResponse?.filter((photo: Photo) => 
                    !uploadedIds.includes(photo.id) && !photo.isDeleted
                ) || [];

                // Если это автор страницы, добавляем фотографии из альбома "Загруженное" (кроме удаленных)
                const photosToShow = isAuthor 
                    ? photosResponse?.filter((photo: Photo) => !photo.isDeleted) 
                    : filteredPhotos;

                // Берем только первые 6 фотографий для витрины
                setPhotos(photosToShow.slice(0, 6) || []);
                
                // Обрабатываем альбомы
                let albumsToShow = albumsResponse || [];
                if (!isAuthor) {
                    // Для не-автора фильтруем альбом "Загруженное"
                    albumsToShow = albumsToShow.filter((album: Album) => album.title !== 'Загруженное');
                }
                // Фильтруем удаленные фотографии из альбомов и пустые альбомы
                albumsToShow = albumsToShow
                    .map((album: Album) => ({
                        ...album,
                        photos: album.photos.filter((photo: Photo) => !photo.isDeleted),
                        photosCount: album.photos.filter((photo: Photo) => !photo.isDeleted).length
                    }))
                    .filter((album: Album) => album.photosCount > 0);
                // Берем только первые 4 альбома
                setAlbums(albumsToShow.slice(0, 4));
            } catch (err) {
                console.error('Ошибка при загрузке данных витрины:', err);
                setError('Не удалось загрузить данные');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchData();
        }
    }, [userId, isAuthor]);

    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo);
    };

    const handleAlbumClick = (albumId: number) => {
        navigate(`/albums/${albumId}`);
    };

    const handleShowAllPhotos = () => {
        navigate(`/users/${userId}/photos`);
    };

    const handlePhotoDelete = async (photo: Photo) => {
        try {
            await api.delete(`/photos/${photo.id}`);
            // Обновляем список фотографий после удаления
            setPhotos(prevPhotos => prevPhotos.filter(p => p.id !== photo.id));
            
            // Обновляем количество фотографий в альбомах
            setAlbums(prevAlbums => prevAlbums.map(album => {
                // Проверяем, есть ли удаленная фотография в этом альбоме
                const hasDeletedPhoto = album.photos.some(p => p.id === photo.id);
                if (hasDeletedPhoto) {
                    return {
                        ...album,
                        photos: album.photos.filter(p => p.id !== photo.id),
                        photosCount: album.photosCount - 1
                    };
                }
                return album;
            }));
            
            setSelectedPhoto(null);
        } catch (err) {
            console.error('Ошибка при удалении фотографии:', err);
            alert('Не удалось удалить фотографию');
        }
    };

    if (loading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!photos.length && !albums.length) {
        return null;
    }

    const tabs = [
        { id: 'photos' as Tab, label: 'Фотографии' }
    ];

    return (
        <div className={styles.showcase}>
            <div className={styles.tabs}>
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'photos' && (
                <>
                    {albums.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}>Альбомы</h3>
                                <button 
                                    className={styles.showAllButton}
                                    onClick={handleShowAllPhotos}
                                >
                                    Показать все
                                </button>
                            </div>
                            <div className={styles.albumsGrid}>
                                {albums.map(album => (
                                    <div 
                                        key={album.id} 
                                        className={styles.albumItem}
                                        onClick={() => handleAlbumClick(album.id)}
                                    >
                                        <div className={styles.albumPreview}>
                                            {album.photos[0] && (
                                                <ServerImage 
                                                    path={album.photos[album.photos.length - 1].path} 
                                                    alt={album.title} 
                                                />
                                            )}
                                            {isAuthor && album.title === 'Загруженное' && (
                                                <div className={styles.lockIcon}>🔒</div>
                                            )}
                                        </div>
                                        <div className={styles.albumInfo}>
                                            <div className={styles.albumTitle}>{album.title}</div>
                                            <div className={styles.albumCount}>
                                                {album.photos.filter(photo => !photo.isDeleted).length} фото
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {photos.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}>Все фотографии</h3>
                                <button 
                                    className={styles.showAllButton}
                                    onClick={handleShowAllPhotos}
                                >
                                    Показать все
                                </button>
                            </div>
                            <div className={styles.photosGrid}>
                                {photos.map(photo => (
                                    <div 
                                        key={photo.id} 
                                        className={styles.photoItem}
                                        onClick={() => handlePhotoClick(photo)}
                                    >
                                        <ServerImage 
                                            path={photo.path} 
                                            alt="Фото" 
                                        />
                                        {isAuthor && uploadedPhotoIds.includes(photo.id) && (
                                            <div className={styles.lockIcon}>🔒</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {selectedPhoto && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => setSelectedPhoto(null)}
                    onDelete={isAuthor ? () => handlePhotoDelete(selectedPhoto) : undefined}
                    canDelete={isAuthor}
                />
            )}
        </div>
    );
}; 