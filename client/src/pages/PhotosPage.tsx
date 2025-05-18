import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Photo } from '../types/post.types';
import { Album } from '../types/album.types';
import { api } from '../utils/api';
import { ServerImage } from '../components/ServerImage/ServerImage';
import { PhotoViewer } from '../components/PhotoViewer/PhotoViewer';
import { CreateAlbumForm } from '../components/CreateAlbumForm/CreateAlbumForm';
import { useAuth } from '../contexts/AuthContext';
import styles from './PhotosPage.module.css';

interface PhotosByYear {
    [year: string]: Photo[];
}

interface PhotosPageProps {}

export const PhotosPage: React.FC<PhotosPageProps> = () => {
    const { userId } = useParams<{ userId: string }>();
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [photosByYear, setPhotosByYear] = useState<PhotosByYear>({});
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateAlbum, setShowCreateAlbum] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState<number>(-1);
    const isAuthor = currentUser?.id === parseInt(userId || '0');

    useEffect(() => {
        const fetchData = async () => {
            if (!userId) {
                setError('ID пользователя не указан');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const photosPromise = api.get(`/photos/user/${userId}`).catch(err => {
                    console.error('Ошибка при загрузке фотографий:', err);
                    return [];
                });

                const albumsPromise = api.get(`/albums/user/${userId}`).catch(err => {
                    console.error('Ошибка при загрузке альбомов:', err);
                    return [];
                });

                const [photosResponse, albumsResponse] = await Promise.all([
                    photosPromise,
                    albumsPromise
                ]);

                const photos = photosResponse || [];
                // Фильтруем удаленные фотографии
                const activePhotos = photos.filter((photo: Photo) => !photo.isDeleted);
                setPhotos(activePhotos);

                // Группировка фотографий по годам
                const photosByYear = activePhotos.reduce((acc: PhotosByYear, photo: Photo) => {
                    const year = new Date(photo.createdAt).getFullYear().toString();
                    if (!acc[year]) {
                        acc[year] = [];
                    }
                    acc[year].push(photo);
                    return acc;
                }, {});

                // Сортировка годов по убыванию
                const sortedPhotosByYear = Object.keys(photosByYear)
                    .sort((a: string, b: string) => parseInt(b) - parseInt(a))
                    .reduce((acc: PhotosByYear, year: string) => {
                        acc[year] = photosByYear[year].sort((a: Photo, b: Photo) => 
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                        );
                        return acc;
                    }, {});

                setPhotosByYear(sortedPhotosByYear);
                setAlbums(albumsResponse || []);
            } catch (err) {
                console.error('Ошибка при загрузке данных:', err);
                setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const handleAlbumCreated = async () => {
        setShowCreateAlbum(false);
        try {
            const response = await api.get(`/albums/user/${userId}`);
            setAlbums(response || []);
        } catch (err) {
            console.error('Ошибка при обновлении списка альбомов:', err);
        }
    };

    const handleAlbumClick = (albumId: number) => {
        navigate(`/albums/${albumId}`);
    };

    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo);
        
        // Находим индекс выбранной фотографии среди всех фотографий
        const index = photos.findIndex(p => p.id === photo.id);
        setCurrentPhotoIndex(index);
    };

    const handlePhotoChange = (photo: Photo) => {
        setSelectedPhoto(photo);
    };

    const handleIndexChange = (index: number) => {
        setCurrentPhotoIndex(index);
    };

    const handlePhotoDelete = async (photo: Photo) => {
        try {
            await api.delete(`/photos/${photo.id}`);
            
            // Обновляем список фотографий после удаления
            setPhotos(prevPhotos => prevPhotos.filter(p => p.id !== photo.id));
            
            // Обновляем фотографии по годам
            setPhotosByYear(prevPhotosByYear => {
                const newPhotosByYear = { ...prevPhotosByYear };
                Object.keys(newPhotosByYear).forEach(year => {
                    newPhotosByYear[year] = newPhotosByYear[year].filter(p => p.id !== photo.id);
                    // Удаляем год, если в нем не осталось фотографий
                    if (newPhotosByYear[year].length === 0) {
                        delete newPhotosByYear[year];
                    }
                });
                return newPhotosByYear;
            });

            // Обновляем количество фотографий в альбомах
            setAlbums(prevAlbums => prevAlbums.map(album => {
                // Проверяем, есть ли удаленная фотография в этом альбоме
                const hasDeletedPhoto = album.photos.some(p => p.id === photo.id);
                if (hasDeletedPhoto) {
                    return {
                        ...album,
                        photos: album.photos.filter(p => p.id !== photo.id),
                        photosCount: album.photos.filter(p => p.id !== photo.id && !p.isDeleted).length
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
        return (
            <div className={styles.loading}>
                <div className={styles.spinner} />
                <div>Загрузка...</div>
            </div>
        );
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Фотографии</h2>
                <button 
                    className={styles.createAlbumButton}
                    onClick={() => setShowCreateAlbum(true)}
                >
                    Создать альбом
                </button>
            </div>

            {showCreateAlbum && (
                <div className={styles.createAlbumSection}>
                    <CreateAlbumForm 
                        onSuccess={handleAlbumCreated}
                        onCancel={() => setShowCreateAlbum(false)}
                    />
                </div>
            )}

            {albums.length > 0 && (
                <div className={styles.albumsSection}>
                    <h3 className={styles.sectionTitle}>Альбомы</h3>
                    <div className={styles.albumsGrid}>
                        {albums.map(album => (
                            <div 
                                key={album.id} 
                                className={styles.albumItem}
                                onClick={() => handleAlbumClick(album.id)}
                                role="button"
                                tabIndex={0}
                            >
                                <div className={styles.albumPreview}>
                                    {album.photos[0] && (
                                        <ServerImage 
                                            path={album.photos[album.photos.length - 1].path} 
                                            alt={album.title} 
                                        />
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

            <div className={styles.photosSection}>
                <h3 className={styles.sectionTitle}>Все фотографии</h3>
                {Object.keys(photosByYear).length > 0 ? (
                    Object.entries(photosByYear).map(([year, yearPhotos]) => (
                        <div key={year} className={styles.yearSection}>
                            <h4 className={styles.yearTitle}>{year} год</h4>
                            <div className={styles.photosGrid}>
                                {yearPhotos.map((photo) => (
                                    <div 
                                        key={photo.id} 
                                        className={styles.photoItem}
                                        onClick={() => handlePhotoClick(photo)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <ServerImage path={photo.path} alt="Фото" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.empty}>
                        Нет загруженных фотографий
                    </div>
                )}
            </div>

            {selectedPhoto && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => {
                        setSelectedPhoto(null);
                        setCurrentPhotoIndex(-1);
                    }}
                    onDelete={isAuthor ? () => handlePhotoDelete(selectedPhoto) : undefined}
                    canDelete={isAuthor}
                    allPhotos={photos.length > 0 ? photos : undefined}
                    currentIndex={currentPhotoIndex >= 0 ? currentPhotoIndex : undefined}
                    onPhotoChange={handlePhotoChange}
                    onIndexChange={handleIndexChange}
                />
            )}
        </div>
    );
}; 