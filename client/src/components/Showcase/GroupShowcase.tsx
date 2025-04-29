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
import { groupService } from '../../services/groupService';
import { Group } from '../../types/group.types';
import { Post } from '../../types/post.types';
import { User } from '../../types/user.types';
import UniversalTrackItem from '../UniversalTrackItem';
import styles from './Showcase.module.css';
import { useQueue } from '../../contexts/QueueContext';

interface GroupShowcaseProps {
    groupId: number;
}

interface GroupWithMembersAndAdmins extends Group {
    members?: User[];
    admins?: User[];
}

type Tab = 'photos' | 'music';

// Контекст для тесной интеграции UniversalTrackItem с showcase группы
interface GroupShowcaseContextProps {
    tracks: Track[];
    playGroupShowcaseTracks: (startTrackId: number) => void;
}

const GroupShowcaseContext = React.createContext<GroupShowcaseContextProps | undefined>(undefined);

export const useGroupShowcase = () => {
    const context = React.useContext(GroupShowcaseContext);
    if (!context) {
        throw new Error('useGroupShowcase must be used within a GroupShowcaseProvider');
    }
    return context;
};

export const GroupShowcase: React.FC<GroupShowcaseProps> = ({ groupId }) => {
    const navigate = useNavigate();
    const { user: currentUser } = useAuth();
    const { addToQueue, setCurrentTrack, playTrack } = usePlayer();
    const { clearQueue, addTracksToQueue } = useQueue();
    const [activeTab, setActiveTab] = useState<Tab>('photos');
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [musicAlbums, setMusicAlbums] = useState<MusicAlbum[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isMember, setIsMember] = useState(false);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Получаем данные группы, включая статус текущего пользователя
                const groupData = await groupService.getGroupById(groupId) as GroupWithMembersAndAdmins;
                if (!groupData) {
                    throw new Error('Группа не найдена');
                }

                // Проверяем, является ли текущий пользователь администратором группы
                if (groupData.admins && currentUser) {
                    setIsAdmin(groupData.admins.some((admin: User) => admin.id === currentUser.id) || groupData.creatorId === currentUser.id);
                }

                // Проверяем, является ли текущий пользователь членом группы
                if (groupData.members && currentUser) {
                    setIsMember(groupData.members.some((member: User) => member.id === currentUser.id));
                }

                // Получаем фотографии группы через новый API эндпоинт
                try {
                    const photosData = await groupService.getGroupMediaPhotos(groupId, 6, 0);
                    setPhotos(photosData.items);
                } catch (photosError) {
                    console.error('Ошибка при загрузке фотографий группы:', photosError);
                    setPhotos([]);
                }
                
                // Получаем альбомы группы через новый API эндпоинт
                try {
                    const albumsData = await groupService.getGroupMediaAlbums(groupId, 4, 0);
                    setAlbums(albumsData.items);
                } catch (albumsError) {
                    console.error('Ошибка при загрузке альбомов группы:', albumsError);
                    setAlbums([]);
                }
                
                // Получаем треки группы через новый API эндпоинт
                try {
                    const tracksData = await groupService.getGroupMediaTracks(groupId, 6, 0);
                    setTracks(tracksData.items);
                } catch (tracksError) {
                    console.error('Ошибка при загрузке треков группы:', tracksError);
                    setTracks([]);
                }
                
                // Получаем музыкальные альбомы группы через новый API эндпоинт
                try {
                    const musicAlbumsData = await groupService.getGroupMediaMusicAlbums(groupId, 4, 0);
                    setMusicAlbums(musicAlbumsData.items);
                } catch (musicAlbumsError) {
                    console.error('Ошибка при загрузке музыкальных альбомов группы:', musicAlbumsError);
                    setMusicAlbums([]);
                }
                
            } catch (err) {
                console.error('Ошибка при загрузке данных витрины группы:', err);
                setError('Не удалось загрузить данные группы');
            } finally {
                setLoading(false);
            }
        };

        if (groupId) {
            fetchData();
        }
    }, [groupId, currentUser]);

    const handlePhotoClick = (photo: Photo) => {
        setSelectedPhoto(photo);
    };

    const handleAlbumClick = (albumId: number) => {
        navigate(`/albums/${albumId}`);
    };

    const handleShowAllPhotos = () => {
        navigate(`/groups/${groupId}/photos`);
    };

    const handleShowAllMusicAlbums = () => {
        navigate(`/groups/${groupId}/music-albums`);
    };

    const handleShowAllTracks = () => {
        navigate(`/groups/${groupId}/music`);
    };

    const handleMusicAlbumClick = (albumId: number) => {
        navigate(`/music-albums/${albumId}`);
    };

    const handleTrackPlay = (track: Track) => {
        setSelectedTrack(track);
        setCurrentTrack(track);
        addToQueue(track);
    };

    const handlePhotoDelete = async (photo: Photo) => {
        if (!isAdmin) return;
        
        try {
            await api.delete(`/photos/${photo.id}`);
            // Обновляем список фотографий после удаления
            setPhotos(prevPhotos => prevPhotos.filter(p => p.id !== photo.id));
            
            // Обновляем количество фотографий в альбомах
            setAlbums(prevAlbums => prevAlbums.map(album => {
                // Проверяем, есть ли удаленная фотография в этом альбоме
                const hasDeletedPhoto = album.photos && album.photos.some(p => p.id === photo.id);
                if (hasDeletedPhoto) {
                    return {
                        ...album,
                        photos: album.photos.filter(p => p.id !== photo.id),
                        photosCount: (album.photosCount || 0) - 1
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

    // Функция для запуска воспроизведения треков из showcase группы
    const playGroupShowcaseTracks = (startTrackId: number) => {
        // Если нет треков, ничего не делаем
        if (!tracks || tracks.length === 0) return;
        
        // Найдем индекс трека, с которого нужно начать
        const startIndex = tracks.findIndex(track => track.id === startTrackId);
        if (startIndex === -1) return;
        
        console.log(`[GroupShowcase] Воспроизведение треков с индекса ${startIndex}, ID ${startTrackId}`);
        
        // Очищаем текущую очередь
        clearQueue();
        
        // Подготавливаем все треки showcase для добавления в очередь
        const tracksForQueue = tracks.map(track => {
            // Проверяем и добавляем audioUrl при необходимости
            if (!track.audioUrl && track.filename) {
                return {
                    ...track,
                    audioUrl: `/api/music/file/${track.filename}`,
                    source: { type: 'groupShowcase', groupId }
                };
            }
            return {
                ...track,
                source: { type: 'groupShowcase', groupId }
            };
        });
        
        // Заменяем очередь всеми треками из showcase
        addTracksToQueue(tracksForQueue);
        
        // Воспроизводим трек, с которого хотим начать
        playTrack(tracksForQueue[startIndex]);
    };

    if (loading) {
        return <div className={styles.loading}>Загрузка медиа-контента...</div>;
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    const tabs = [
        { id: 'photos' as Tab, label: 'Фотографии' }
    ];
    
    if (tracks.length > 0 || musicAlbums.length > 0 || isAdmin) {
        tabs.push({ id: 'music' as Tab, label: 'Музыка' });
    }

    // Создаем значение для контекста showcase группы
    const groupShowcaseContextValue = {
        tracks,
        playGroupShowcaseTracks
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
                    {albums.length > 0 ? (
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
                                            {album.photos && album.photos[0] && (
                                                <ServerImage 
                                                    path={album.photos[album.photos.length - 1].path} 
                                                    alt={album.title} 
                                                />
                                            )}
                                        </div>
                                        <div className={styles.albumInfo}>
                                            <div className={styles.albumTitle}>{album.title}</div>
                                            <div className={styles.albumCount}>
                                                {(album.photosCount || (album.photos ? album.photos.length : 0))} фото
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : isAdmin && (
                        <div className={styles.emptySection}>
                            <div className={styles.emptyIcon}>📸</div>
                            <div className={styles.emptyTitle}>Нет фотоальбомов</div>
                            <div className={styles.emptyText}>
                                Создайте фотоальбом для вашего сообщества или добавьте фотографии в посты
                            </div>
                        </div>
                    )}

                    {photos.length > 0 ? (
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
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (!albums.length && !photos.length) && (
                        <div className={styles.emptySection}>
                            <div className={styles.emptyIcon}>🖼️</div>
                            <div className={styles.emptyTitle}>Нет фотографий</div>
                            {isAdmin ? (
                                <div className={styles.emptyText}>
                                    Добавьте первые фотографии в сообщество, прикрепив их к постам!
                                </div>
                            ) : (
                                <div className={styles.emptyText}>
                                    В этом сообществе пока нет фотографий
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {activeTab === 'music' && (
                <GroupShowcaseContext.Provider value={groupShowcaseContextValue}>
                    {musicAlbums.length > 0 ? (
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
                    ) : (
                        <div className={styles.emptySection}>
                            <div className={styles.emptyIcon}>💿</div>
                            <div className={styles.emptyTitle}>Нет музыкальных альбомов</div>
                            {isAdmin ? (
                                <>
                                    <div className={styles.emptyText}>
                                        Создайте первый музыкальный альбом для вашего сообщества!
                                    </div>
                                    <button 
                                        className={styles.addMusicButton}
                                        onClick={() => navigate(`/music-albums/create?groupId=${groupId}`)}
                                    >
                                        Создать альбом
                                    </button>
                                </>
                            ) : (
                                <div className={styles.emptyText}>
                                    В этом сообществе пока нет музыкальных альбомов
                                </div>
                            )}
                        </div>
                    )}

                    {tracks.length > 0 ? (
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
                                        onPlayClick={() => playGroupShowcaseTracks(track.id)}
                                    />
                                ))}
                            </div>
                            
                            {isAdmin && (
                                <button 
                                    className={styles.addMusicButton}
                                    onClick={() => navigate(`/music?groupId=${groupId}`)}
                                >
                                    Добавить музыку
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className={styles.emptySection}>
                            <div className={styles.emptyIcon}>🎵</div>
                            <div className={styles.emptyTitle}>Нет треков</div>
                            {isAdmin ? (
                                <>
                                    <div className={styles.emptyText}>
                                        Добавьте первые треки в сообщество, чтобы они отображались здесь!
                                    </div>
                                    <button 
                                        className={styles.addMusicButton}
                                        onClick={() => navigate(`/music?groupId=${groupId}`)}
                                    >
                                        Добавить музыку
                                    </button>
                                </>
                            ) : (
                                <div className={styles.emptyText}>
                                    В этом сообществе пока нет музыки
                                </div>
                            )}
                        </div>
                    )}
                </GroupShowcaseContext.Provider>
            )}

            {selectedPhoto && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => setSelectedPhoto(null)}
                    onDelete={isAdmin ? () => handlePhotoDelete(selectedPhoto) : undefined}
                    canDelete={isAdmin}
                />
            )}
        </div>
    );
}; 