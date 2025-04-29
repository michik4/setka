import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Photo } from '../../types/photo.types';
import { Album } from '../../types/album.types';
import { Track, MusicAlbum } from '../../types/music.types';
import { ServerImage } from '../ServerImage/ServerImage';
import { PhotoViewer } from '../PhotoViewer/PhotoViewer';
import { api } from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import { MusicService } from '../../services/music.service';
import { MusicAlbumService } from '../../services/music-album.service';
import { usePlayer } from '../../contexts/PlayerContext';
import { useQueue } from '../../contexts/QueueContext';
import UniversalTrackItem from '../UniversalTrackItem';
import styles from './Showcase.module.css';

interface ShowcaseProps {
    userId: string;
}

type Tab = 'photos' | 'music';

// Добавляем контекст для тесной интеграции UniversalTrackItem с showcase
interface ShowcaseContextProps {
    tracks: Track[];
    playShowcaseTracks: (startTrackId: number) => void;
}

const ShowcaseContext = React.createContext<ShowcaseContextProps | undefined>(undefined);

export const useShowcase = () => {
    const context = React.useContext(ShowcaseContext);
    if (!context) {
        throw new Error('useShowcase must be used within a ShowcaseProvider');
    }
    return context;
};

export const Showcase: React.FC<ShowcaseProps> = ({ userId }) => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { addToQueue, setCurrentTrack, playTrack } = usePlayer();
    const { clearQueue, replaceQueue } = useQueue();
    const [activeTab, setActiveTab] = useState<Tab>('photos');
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [musicAlbums, setMusicAlbums] = useState<MusicAlbum[]>([]);
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

                // Загружаем музыкальные данные
                if (activeTab === 'music' || !loading) {
                    try {
                        console.log('Загрузка музыкальных данных для пользователя:', userId);
                        
                        // Получаем треки пользователя через MusicService
                        // Пока API не поддерживает получение треков других пользователей
                        let userTracks: Track[] = [];
                        if (isAuthor) {
                            try {
                                const musicResponse = await MusicService.getUserTracks(6);
                                userTracks = musicResponse.tracks?.slice(0, 6) || [];
                            } catch (tracksErr) {
                                console.error('Ошибка при загрузке треков текущего пользователя:', tracksErr);
                            }
                        }
                        setTracks(userTracks);

                        // Получаем музыкальные альбомы пользователя через MusicAlbumService
                        // Пока API не поддерживает получение альбомов других пользователей
                        let userAlbums: MusicAlbum[] = [];
                        if (isAuthor) {
                            try {
                                const albumsResponse = await MusicAlbumService.getUserAlbums();
                                userAlbums = albumsResponse.slice(0, 4) || [];
                            } catch (albumsErr) {
                                console.error('Ошибка при загрузке музыкальных альбомов текущего пользователя:', albumsErr);
                            }
                        }
                        setMusicAlbums(userAlbums);
                        
                        console.log(`Музыкальные данные загружены: ${userTracks.length} треков, ${userAlbums.length} альбомов`);
                    } catch (err) {
                        console.error('Ошибка при загрузке музыкальных данных:', err);
                        setTracks([]);
                        setMusicAlbums([]);
                    } finally {
                        // Даже если были ошибки, не показываем пользователю ошибку загрузки всей страницы
                        // Просто показываем пустые состояния для музыкальных секций
                    }
                }
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
    }, [userId, isAuthor, activeTab]);

    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo);
    };

    const handleAlbumClick = (albumId: number) => {
        navigate(`/albums/${albumId}`);
    };

    const handleShowAllPhotos = () => {
        navigate(`/users/${userId}/photos`);
    };

    const handleShowAllMusicAlbums = () => {
        navigate(`/users/${userId}/music-albums`);
    };

    const handleShowAllTracks = () => {
        navigate(`/users/${userId}/music`);
    };

    const handleMusicAlbumClick = (albumId: number) => {
        navigate(`/music-albums/${albumId}`);
    };

    const handleTrackPlay = (track: Track) => {
        setCurrentTrack(track);
        addToQueue(track);
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

    // Функция для запуска воспроизведения треков из showcase
    const playShowcaseTracks = (startTrackId: number) => {
        // Если нет треков, ничего не делаем
        if (!tracks || tracks.length === 0) return;
        
        // Найдем индекс трека, с которого нужно начать
        const startIndex = tracks.findIndex(track => track.id === startTrackId);
        if (startIndex === -1) return;
        
        console.log(`[Showcase] Воспроизведение треков с индекса ${startIndex}, ID ${startTrackId}`);
        
        // Очищаем текущую очередь
        clearQueue();
        
        // Подготавливаем все треки showcase для добавления в очередь
        const tracksForQueue = tracks.map(track => {
            // Проверяем и добавляем audioUrl при необходимости
            if (!track.audioUrl && track.filename) {
                return {
                    ...track,
                    audioUrl: `/api/music/file/${track.filename}`,
                    source: { type: 'showcase', userId }
                };
            }
            return {
                ...track,
                source: { type: 'showcase', userId }
            };
        });
        
        // Заменяем очередь всеми треками из showcase
        replaceQueue(tracksForQueue);
        
        // Воспроизводим трек, с которого хотим начать
        playTrack(tracksForQueue[startIndex]);
    };

    if (loading) {
        return <div className={styles.loading}>Загрузка...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!photos.length && !albums.length && !tracks.length && !musicAlbums.length) {
        return null;
    }

    const tabs = [
        { id: 'photos' as Tab, label: 'Фотографии' }
    ];
    
    if (tracks.length > 0 || musicAlbums.length > 0 || isAuthor) {
        tabs.push({ id: 'music' as Tab, label: 'Музыка' });
    }

    // Создаем значение для контекста showcase
    const showcaseContextValue = {
        tracks,
        playShowcaseTracks
    };

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

            {activeTab === 'music' && (
                <ShowcaseContext.Provider value={showcaseContextValue}>
                    {musicAlbums.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}>Музыкальные альбомы</h3>
                                <button 
                                    className={styles.showAllButton}
                                    onClick={handleShowAllMusicAlbums}
                                >
                                    Показать все
                                </button>
                            </div>
                            <div className={styles.albumsGrid}>
                                {musicAlbums.map(album => (
                                    <div 
                                        key={album.id} 
                                        className={styles.albumItem}
                                        onClick={() => handleMusicAlbumClick(album.id)}
                                    >
                                        <div className={styles.albumPreview}>
                                            {album.coverUrl ? (
                                                <ServerImage 
                                                    path={album.coverUrl} 
                                                    alt={album.title} 
                                                />
                                            ) : (
                                                <div className={styles.defaultAlbumCover}>
                                                    🎵
                                                </div>
                                            )}
                                            {album.isPrivate && (
                                                <div className={styles.lockIcon}>🔒</div>
                                            )}
                                        </div>
                                        <div className={styles.albumInfo}>
                                            <div className={styles.albumTitle}>{album.title}</div>
                                            <div className={styles.albumCount}>
                                                {album.tracksCount} {album.tracksCount === 1 ? 'трек' : 
                                                album.tracksCount < 5 ? 'трека' : 'треков'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {musicAlbums.length === 0 && activeTab === 'music' && !loading && (
                        <div className={styles.emptySection}>
                            <div className={styles.emptyIcon}>💿</div>
                            <div className={styles.emptyTitle}>Нет музыкальных альбомов</div>
                            {isAuthor ? (
                                <>
                                    <div className={styles.emptyText}>
                                        Создайте свой первый музыкальный альбом, чтобы организовать свою музыку!
                                    </div>
                                    <button 
                                        className={styles.addMusicButton}
                                        onClick={() => navigate('/music-albums/create')}
                                    >
                                        Создать альбом
                                    </button>
                                </>
                            ) : (
                                <div className={styles.emptyText}>
                                    Просмотр музыкальных альбомов других пользователей пока недоступен. Функция появится в следующих обновлениях.
                                </div>
                            )}
                        </div>
                    )}

                    {tracks.length > 0 && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h3 className={styles.sectionTitle}>Треки</h3>
                                <button 
                                    className={styles.showAllButton}
                                    onClick={handleShowAllTracks}
                                >
                                    Показать все
                                </button>
                            </div>
                            <div className={styles.tracksGrid}>
                                {tracks.map(track => (
                                    <UniversalTrackItem
                                        key={track.id}
                                        track={track}
                                        variant="post"
                                        className={styles.showcaseTrackItem}
                                        onPlayClick={() => playShowcaseTracks(track.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {tracks.length === 0 && musicAlbums.length === 0 && activeTab === 'music' && !loading && (
                        <div className={styles.emptySection}>
                            <div className={styles.emptyIcon}>🎵</div>
                            <div className={styles.emptyTitle}>Нет музыки</div>
                            {isAuthor ? (
                                <div className={styles.emptyText}>
                                    Добавьте свои первые треки в музыкальную библиотеку!
                                </div>
                            ) : (
                                <div className={styles.emptyText}>
                                    {/* Более точное сообщение о том, что просмотр музыки других пользователей пока недоступен */}
                                    Просмотр музыки других пользователей пока недоступен. Функция появится в следующих обновлениях.
                                </div>
                            )}
                            {isAuthor && (
                                <button 
                                    className={styles.addMusicButton}
                                    onClick={() => navigate('/music')}
                                >
                                    Добавить музыку
                                </button>
                            )}
                        </div>
                    )}
                </ShowcaseContext.Provider>
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