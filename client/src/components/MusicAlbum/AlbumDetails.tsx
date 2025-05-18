import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MusicAlbumService } from '../../services/music-album.service';
import { MusicAlbum, Track } from '../../types/music.types';
import { DEFAULT_COVER_URL } from '../../config/constants';
import UploadTracksToAlbumModal from './UploadTracksToAlbumModal';
import { usePlayer } from '../../contexts/PlayerContext';
import { useQueue } from '../../contexts/QueueContext';
import UniversalTrackItem from '../UniversalTrackItem/UniversalTrackItem';
import styles from './MusicAlbum.module.css';
import { Spinner } from '../Spinner/Spinner';
import { PlayArrow, DeleteForever, Add as AddIcon, PlaylistAdd, Edit, PlaylistAddCheck } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const AlbumDetails: React.FC = () => {
    const { albumId } = useParams<{ albumId: string }>();
    const navigate = useNavigate();
    const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
    const { replaceQueue, addToQueue } = useQueue();
    const { user } = useAuth();

    const [album, setAlbum] = useState<MusicAlbum | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    const [isAddingToLibrary, setIsAddingToLibrary] = useState(false);
    const [isInLibrary, setIsInLibrary] = useState(false);
    
    // Состояния для серверной пагинации
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [totalTracks, setTotalTracks] = useState(0);
    const [sortBy, setSortBy] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
    const tracksPerPage = 10;
    const tracksListRef = useRef<HTMLDivElement>(null);

    // Определяем, является ли текущий пользователь владельцем альбома
    const isOwner = album && user && album.userId === user.id;

    // Используем ref для отслеживания, выполнен ли первоначальный запрос
    const initialFetchDone = useRef(false);
    
    // Обработчик скролла для бесконечной ленты
    const handleScroll = useCallback(() => {
        if (!tracksListRef.current || isLoadingMore || !hasMore) return;
        
        const { scrollTop, scrollHeight, clientHeight } = tracksListRef.current;
        
        // Если пользователь прокрутил до конца списка (с небольшим запасом)
        if (scrollTop + clientHeight >= scrollHeight - 100) {
            loadMoreTracks();
        }
    }, [isLoadingMore, hasMore]);
    
    // Наблюдатель за скроллом
    useEffect(() => {
        const currentRef = tracksListRef.current;
        if (currentRef) {
            currentRef.addEventListener('scroll', handleScroll);
        }
        
        return () => {
            if (currentRef) {
                currentRef.removeEventListener('scroll', handleScroll);
            }
        };
    }, [handleScroll]);
    
    // При загрузке компонента получаем данные альбома и первую страницу треков
    useEffect(() => {
        if (albumId && !initialFetchDone.current) {
            // Загружаем альбом
            fetchAlbum(parseInt(albumId));
            // Загружаем первую страницу треков
            fetchInitialTracks(parseInt(albumId));
            initialFetchDone.current = true;
        }
    }, [albumId]);
    
    // При изменении параметров сортировки, обновляем список треков
    useEffect(() => {
        if (albumId && initialFetchDone.current) {
            setTracks([]);
            setCurrentPage(1);
            setHasMore(true);
            fetchInitialTracks(parseInt(albumId));
        }
    }, [sortBy, sortOrder]);
    
    // Загрузка первой страницы треков
    const fetchInitialTracks = async (id: number) => {
        try {
            const response = await MusicAlbumService.getAlbumTracks(id, 1, tracksPerPage, sortBy, sortOrder);
            setTracks(response.tracks);
            setCurrentPage(1);
            setHasMore(response.pagination.hasMore);
            setTotalTracks(response.pagination.totalTracks);
        } catch (error) {
            console.error('Ошибка при загрузке треков:', error);
            setError('Не удалось загрузить треки альбома');
        }
    };
    
    // Функция загрузки дополнительных треков с сервера
    const loadMoreTracks = useCallback(async () => {
        if (!albumId || isLoadingMore) return;
        
        const nextPage = currentPage + 1;
        setIsLoadingMore(true);
        
        try {
            const response = await MusicAlbumService.getAlbumTracks(
                parseInt(albumId), 
                nextPage, 
                tracksPerPage,
                sortBy,
                sortOrder
            );
            
            if (response.tracks.length === 0) {
                setHasMore(false);
            } else {
                setTracks(prev => [...prev, ...response.tracks]);
                setCurrentPage(nextPage);
                setHasMore(response.pagination.hasMore);
                setTotalTracks(response.pagination.totalTracks);
            }
        } catch (error) {
            console.error('Ошибка при загрузке треков:', error);
            setError('Не удалось загрузить треки альбома');
        } finally {
            setIsLoadingMore(false);
        }
    }, [albumId, currentPage, isLoadingMore, sortBy, sortOrder]);
    
    // Обработчик изменения сортировки
    const handleSortChange = (field: string) => {
        if (field === sortBy) {
            // Если выбрано то же поле, меняем порядок сортировки
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            // Если выбрано новое поле, устанавливаем его и сбрасываем порядок на asc
            setSortBy(field);
            setSortOrder('asc');
        }
    };

    // Проверка наличия альбома в библиотеке при загрузке данных альбома
    useEffect(() => {
        if (album && albumId) {
            checkAlbumInLibrary(parseInt(albumId));
        }
    }, [album, albumId]);

    // Функция для проверки наличия альбома в библиотеке
    const checkAlbumInLibrary = async (id: number) => {
        try {
            const isInLib = await MusicAlbumService.isAlbumInLibrary(id);
            setIsInLibrary(isInLib);
        } catch (error) {
            console.error(`Ошибка при проверке наличия альбома ${id} в библиотеке:`, error);
        }
    };

    const fetchAlbum = async (id: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const albumData = await MusicAlbumService.getAlbumById(id);
            setAlbum(albumData);
        } catch (error) {
            console.error(`Ошибка при получении альбома ${id}:`, error);
            setError('Не удалось загрузить альбом. Пожалуйста, попробуйте еще раз.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrackPlay = (track: Track) => {
        // Заменяем очередь треками альбома с сервера
        replaceQueue(tracks);
        playTrack(track);
    };

    const handlePlayAllTracks = () => {
        if (tracks && tracks.length > 0) {
            // Заменяем текущую очередь треками из альбома
            replaceQueue(tracks);
            // Воспроизводим первый трек
            playTrack(tracks[0]);
        }
    };

    const handleRemoveTrack = async (trackId: number) => {
        if (!album || !albumId) return;

        try {
            await MusicAlbumService.removeTrackFromAlbum(parseInt(albumId), trackId);
            // Обновляем данные альбома
            fetchAlbum(parseInt(albumId));
        } catch (error) {
            console.error(`Ошибка при удалении трека ${trackId} из альбома:`, error);
            setError('Не удалось удалить трек из альбома. Пожалуйста, попробуйте еще раз.');
        }
    };

    const handleDeleteAlbum = async () => {
        if (!album || !albumId) return;

        try {
            await MusicAlbumService.deleteAlbum(parseInt(albumId));
            navigate('/music/albums');
        } catch (error) {
            console.error(`Ошибка при удалении альбома ${albumId}:`, error);
            setError('Не удалось удалить альбом. Пожалуйста, попробуйте еще раз.');
        }
    };

    const handleUploadSuccess = () => {
        if (albumId) {
            // Обновляем информацию об альбоме
            fetchAlbum(parseInt(albumId));
            // Сбрасываем и заново загружаем треки
            setTracks([]);
            setCurrentPage(1);
            setHasMore(true);
            fetchInitialTracks(parseInt(albumId));
        }
    };

    const formatDuration = (duration: string) => {
        const parts = duration.split(':');
        if (parts.length === 2) {
            return duration; // Если формат уже MM:SS
        }
        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts;
            if (hours === '00') {
                return `${minutes}:${seconds}`; // Если часы = 0, возвращаем MM:SS
            }
            return duration; // Иначе возвращаем как есть
        }
        return duration; // Возвращаем исходный формат, если не удалось распознать
    };

    // Обработчик добавления альбома в библиотеку пользователя
    const handleAddToLibrary = async () => {
        if (!album || !albumId) return;

        setIsAddingToLibrary(true);
        try {
            const result = await MusicAlbumService.addAlbumToLibrary(parseInt(albumId));
            // Показываем уведомление об успешном добавлении
            setError(null); // Сбрасываем ошибки
            
            // Устанавливаем флаг, что альбом в библиотеке
            setIsInLibrary(true);
            
            if (result.success) {
                alert('Альбом успешно добавлен в вашу библиотеку');
            } else if (result.alreadyExists) {
                alert('Этот альбом уже есть в вашей библиотеке');
            }
        } catch (error) {
            console.error(`Ошибка при добавлении альбома ${albumId} в библиотеку:`, error);
            
            // Если ошибка связана с тем, что альбом уже в библиотеке
            if (error instanceof Error && error.message.includes('уже существует в вашей библиотеке')) {
                setIsInLibrary(true);
                alert('Этот альбом уже есть в вашей библиотеке');
            } else {
                setError('Не удалось добавить альбом в библиотеку. Возможно, у вас уже есть альбом с таким названием.');
            }
        } finally {
            setIsAddingToLibrary(false);
        }
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner />
                <p>Загрузка альбома...</p>
            </div>
        );
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!album) {
        return <div className={styles.error}>Альбом не найден</div>;
    }

    return (
        <div className={styles.albumPage}>
            <div className={styles.albumHeader}>
                <div className={styles.albumHeaderFlex}>
                    <div className={styles.albumHeaderCover}>
                        <img
                            src={album.coverUrl || DEFAULT_COVER_URL}
                            alt={album.title}
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COVER_URL }}
                        />
                    </div>
                    <div className={styles.albumHeaderInfo}>
                        <h1 className={styles.albumHeaderTitle}>
                            {album.title}
                            {album.isPrivate && <span className={styles.privateIndicator}>Приватный</span>}
                        </h1>

                        <button
                            className={`${styles.actionButton} ${styles.secondaryButton} ${isInLibrary ? styles.inLibrary : ''}`}
                            onClick={handleAddToLibrary}
                            disabled={isAddingToLibrary || isInLibrary}
                            title={isInLibrary ? "Альбом в вашей библиотеке" : "Добавить в библиотеку"}
                        >
                            {isInLibrary ? (
                                <>
                                    <PlaylistAddCheck />
                                    В библиотеке
                                </>
                            ) : (
                                <>
                                    <AddIcon />
                                    {isAddingToLibrary ? 'Добавление...' : 'Добавить в библиотеку'}
                                </>
                            )}
                        </button>

                        {album.description && (
                            <p className={styles.albumHeaderDescription}>{album.description}</p>
                        )}

                        <div className={styles.albumStats}>
                            <span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 19V5L21 3V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    <circle cx="6" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
                                    <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                {totalTracks} {getTrackWord(totalTracks)}
                            </span>
                            <span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                                    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                    <path d="M3 10H21" stroke="currentColor" strokeWidth="2" />
                                </svg>
                                Создан: {new Date(album.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div className={styles.albumActions}>
                    <button
                        className={`${styles.actionButton} ${styles.primaryButton}`}
                        onClick={handlePlayAllTracks}
                        disabled={!album.tracks || album.tracks.length === 0}
                    >
                        <PlayArrow />
                        Воспроизвести все
                    </button>

                    {isOwner && (
                        <>
                            <button
                                className={`${styles.actionButton} ${styles.secondaryButton}`}
                                onClick={() => setIsUploadModalOpen(true)}
                                title="Добавить треки"
                            >
                                <PlaylistAdd />
                            </button>
                            <button
                                className={`${styles.actionButton} ${styles.dangerButton}`}
                                onClick={() => setIsConfirmDeleteOpen(true)}
                                title="Удалить альбом"
                            >
                                <DeleteForever />
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.tracksSection}>
                <div className={styles.tracksSectionHeader}>
                    <h2>Треки в альбоме</h2>
                    <div className={styles.sortControls}>
                        <span>Сортировать по:</span>
                        <button 
                            className={`${styles.sortButton} ${sortBy === 'title' ? styles.active : ''}`}
                            onClick={() => handleSortChange('title')}
                            title={`Названию ${sortBy === 'title' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}`}
                        >
                            Название {sortBy === 'title' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </button>
                        <button 
                            className={`${styles.sortButton} ${sortBy === 'artist' ? styles.active : ''}`}
                            onClick={() => handleSortChange('artist')}
                            title={`Исполнителю ${sortBy === 'artist' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}`}
                        >
                            Исполнитель {sortBy === 'artist' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </button>
                        <button 
                            className={`${styles.sortButton} ${sortBy === 'duration' ? styles.active : ''}`}
                            onClick={() => handleSortChange('duration')}
                            title={`Длительности ${sortBy === 'duration' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}`}
                        >
                            Длительность {sortBy === 'duration' && (sortOrder === 'asc' ? '▲' : '▼')}
                        </button>
                    </div>
                </div>

                {tracks.length === 0 && !isLoading ? (
                    <div className={styles.emptyTracks}>
                        <p>В этом альбоме пока нет треков.</p>
                        {isOwner && (
                            <button
                                className={styles.uploadButton}
                                onClick={() => setIsUploadModalOpen(true)}
                            >
                                <AddIcon />
                                Добавить треки
                            </button>
                        )}
                    </div>
                ) : (
                    <div className={styles.tracksList} ref={tracksListRef}>
                        {tracks.map((track, index) => (
                            <UniversalTrackItem
                                key={track.id}
                                track={track}
                                index={index + 1}
                                variant="album"
                                isInLibrary={true}
                                onLibraryStatusChange={() => fetchAlbum(parseInt(albumId || '0'))}
                                className={styles.inTable}
                                onPlayClick={() => handleTrackPlay(track)}
                            />
                        ))}
                        {isLoadingMore && (
                            <div className={styles.loadingMoreContainer}>
                                <Spinner />
                                <span>Загрузка треков...</span>
                            </div>
                        )}
                        {!isLoadingMore && hasMore && (
                            <div className={styles.loadMoreButton} onClick={loadMoreTracks}>
                                Загрузить еще треки
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Модальное окно для загрузки треков */}
            <UploadTracksToAlbumModal
                albumId={parseInt(albumId || '0')}
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={handleUploadSuccess}
            />

            {/* Модальное окно подтверждения удаления */}
            {isConfirmDeleteOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>Удаление альбома</h2>
                        <p>Вы уверены, что хотите удалить альбом "{album.title}"?</p>
                        <p>Это действие нельзя отменить. Треки, которые были добавлены в альбом, останутся в вашей музыкальной библиотеке.</p>

                        <div className={styles.formActions}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setIsConfirmDeleteOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={`${styles.dangerButton}`}
                                onClick={handleDeleteAlbum}
                            >
                                Удалить альбом
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Вспомогательная функция для правильного склонения слова "трек"
function getTrackWord(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'треков';
    }

    if (lastDigit === 1) {
        return 'трек';
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'трека';
    }

    return 'треков';
}

export default AlbumDetails; 