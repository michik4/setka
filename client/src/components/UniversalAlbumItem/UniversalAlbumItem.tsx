import React, { useState, useEffect } from 'react';
import { MusicAlbum, Track } from '../../types/music.types';
import { DEFAULT_COVER_URL } from '../../config/constants';
import { useNavigate } from 'react-router-dom';
import styles from './UniversalAlbumItem.module.css';
import { ExpandLess, ExpandMore, LibraryMusic, PlaylistAdd, PlaylistAddCheck } from '@mui/icons-material';
import UniversalTrackItem from '../UniversalTrackItem';
import { MusicAlbumService } from '../../services/music-album.service';
import { usePlayer } from '../../contexts/PlayerContext';
import { useQueue } from '../../contexts/QueueContext';
import { Spinner } from '../Spinner/Spinner';
import { Link } from 'react-router-dom';

interface UniversalMusicAlbumItemProps {
    album: MusicAlbum;
    variant?: 'default' | 'compact' | 'post' | 'grid';
    className?: string;
    onAlbumClick?: (album: MusicAlbum) => void;
    isInLibrary?: boolean;
    onLibraryStatusChange?: (status: boolean) => void;
}

const UniversalMusicAlbumItem: React.FC<UniversalMusicAlbumItemProps> = ({
    album,
    variant = 'default',
    className = '',
    onAlbumClick,
    isInLibrary = false,
    onLibraryStatusChange
}) => {
    const navigate = useNavigate();
    const { playTrack } = usePlayer();
    const { replaceQueue } = useQueue();

    const [isExpanded, setIsExpanded] = useState(false);
    const [albumTracks, setAlbumTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAddingToLibrary, setIsAddingToLibrary] = useState(false);
    const [isInLib, setIsInLib] = useState<boolean | null>(null);

    // Проверка наличия альбома в библиотеке при монтировании компонента
    useEffect(() => {
        // Проверяем наличие поля isInLibrary в альбоме и используем его,
        // если оно определено (приоритетнее, чем переданный isInLibrary из props)
        if (album && 'isInLibrary' in album && album.isInLibrary !== undefined) {
            console.log(`[UniversalMusicAlbumItem] Альбом "${album.title}" (ID:${album.id}): isInLibrary из объекта альбома = ${album.isInLibrary}`);
            setIsInLib(album.isInLibrary);
            return;
        }
        
        // Устанавливаем начальное значение из пропсов, если поле в объекте альбома не определено
        if (isInLibrary !== undefined && isInLibrary !== null) {
            console.log(`[UniversalMusicAlbumItem] Альбом "${album.title}" (ID:${album.id}): isInLibrary из props = ${isInLibrary} (устанавливаем как начальное состояние)`);
            setIsInLib(isInLibrary);
        }
        
        // Проверяем наличие ID для запроса API (делаем только если не определено isInLibrary в альбоме)
        if (!album || !album.id) {
            console.error('Невозможно проверить наличие альбома в библиотеке: отсутствует ID альбома');
            return;
        }
        
        let isMounted = true;
        
        const checkAlbumInLibrary = async () => {
            try {
                console.log(`[UniversalMusicAlbumItem] Проверка альбома "${album.title}" (ID:${album.id}) в библиотеке через API...`);
                const isInLibrary = await MusicAlbumService.isAlbumInLibrary(album.id);
                console.log(`[UniversalMusicAlbumItem] Результат проверки API: альбом "${album.title}" (ID:${album.id}) ${isInLibrary ? 'НАЙДЕН' : 'НЕ НАЙДЕН'} в библиотеке`);
                
                if (isMounted) {
                    setIsInLib(isInLibrary);
                }
            } catch (error) {
                console.error(`[UniversalMusicAlbumItem] Ошибка при проверке наличия альбома "${album.title}" (ID:${album.id}) в библиотеке:`, error);
                if (isMounted) {
                    // Сохраняем текущее значение isInLib, если оно уже true
                    if (isInLib === true) {
                        console.log(`[UniversalMusicAlbumItem] Сохраняем текущее значение isInLib=true несмотря на ошибку API`);
                    } else {
                        setIsInLib(false);
                    }
                }
            }
        };
        
        // Выполняем проверку через API только если не определено поле isInLibrary в альбоме
        checkAlbumInLibrary();
        
        // Очистка эффекта
        return () => {
            isMounted = false;
        };
    }, [album?.id, album?.title]);

    const handleAlbumClick = () => {
        /*
        if (onAlbumClick) {
            onAlbumClick(album);
        } else {
            //navigate(`/music/albums/${album.id}`);
        }
        */
    };

    const toggleExpand = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем обработку события клика на родительском элементе

        if (!isExpanded && albumTracks.length === 0) {
            // Если альбом раскрывается и треки еще не загружены
            setIsLoading(true);
            setError(null);

            try {
                const albumData = await MusicAlbumService.getAlbumById(album.id);
                if (albumData.tracks) {
                    setAlbumTracks(albumData.tracks);
                }
            } catch (err) {
                console.error('Ошибка при загрузке треков альбома:', err);
                setError('Не удалось загрузить треки. Пожалуйста, попробуйте еще раз.');
            } finally {
                setIsLoading(false);
            }
        }

        setIsExpanded(!isExpanded);
    };

    const handleTrackPlay = (track: Track) => {
        // Заменяем очередь треками альбома, начиная с выбранного трека
        if (albumTracks.length > 0) {
            replaceQueue(albumTracks);
            playTrack(track);
        } else {
            playTrack(track);
        }
    };

    const handlePlayAllTracks = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем обработку события клика на родительском элементе

        if (albumTracks.length === 0) {
            setIsLoading(true);
            setError(null);

            try {
                const albumData = await MusicAlbumService.getAlbumById(album.id);
                if (albumData.tracks && albumData.tracks.length > 0) {
                    setAlbumTracks(albumData.tracks);
                    replaceQueue(albumData.tracks);
                    playTrack(albumData.tracks[0]);
                }
            } catch (err) {
                console.error('Ошибка при загрузке треков альбома:', err);
                setError('Не удалось загрузить треки. Пожалуйста, попробуйте еще раз.');
            } finally {
                setIsLoading(false);
            }
        } else if (albumTracks.length > 0) {
            replaceQueue(albumTracks);
            playTrack(albumTracks[0]);
        }
    };

    const handleAddToLibrary = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем обработку события клика на родительском элементе

        // Дополнительная проверка перед добавлением
        try {
            console.log(`[UniversalMusicAlbumItem] Проверка перед добавлением альбома "${album.title}" (ID:${album.id}) в библиотеку...`);
            const isAlreadyInLibrary = await MusicAlbumService.isAlbumInLibrary(album.id);
            
            if (isAlreadyInLibrary) {
                console.log(`[UniversalMusicAlbumItem] Альбом "${album.title}" (ID:${album.id}) уже в библиотеке, обновляем интерфейс`);
                setIsInLib(true);
                alert('Этот альбом уже есть в вашей библиотеке');
                return;
            }
        } catch (error) {
            console.warn(`[UniversalMusicAlbumItem] Ошибка при проверке наличия альбома в библиотеке:`, error);
            // Продолжаем выполнение, чтобы попробовать добавить альбом
        }

        if (libraryStatus) {
            console.log(`[UniversalMusicAlbumItem] Альбом "${album.title}" (ID:${album.id}) уже в библиотеке, пропускаем добавление`);
            alert('Этот альбом уже есть в вашей библиотеке');
            return;
        }

        setIsAddingToLibrary(true);
        try {
            console.log(`[UniversalMusicAlbumItem] Добавление альбома "${album.title}" (ID:${album.id}) в библиотеку...`);
            const result = await MusicAlbumService.addAlbumToLibrary(album.id);
            
            // Устанавливаем флаг, что альбом в библиотеке
            setIsInLib(true);
            setIsAddingToLibrary(false);
            
            if (onLibraryStatusChange) {
                onLibraryStatusChange(true);
            }
            
            console.log(`[UniversalMusicAlbumItem] Альбом "${album.title}" (ID:${album.id}) успешно добавлен в библиотеку`);
        } catch (error: any) {
            console.error(`[UniversalMusicAlbumItem] Ошибка при добавлении альбома "${album.title}" (ID:${album.id}) в библиотеку:`, error);
            
            // Если ошибка связана с тем, что альбом уже в библиотеке
            if (error.message && error.message.includes('уже существует в вашей библиотеке')) {
                console.log(`[UniversalMusicAlbumItem] Альбом "${album.title}" (ID:${album.id}) уже в библиотеке, обновляем интерфейс`);
                setIsInLib(true);
                alert('Этот альбом уже есть в вашей библиотеке');
                
                if (onLibraryStatusChange) {
                    onLibraryStatusChange(true);
                }
            } else {
                alert(`Ошибка при добавлении альбома: ${error.message || 'Неизвестная ошибка'}`);
            }
            
            setIsAddingToLibrary(false);
        }
    };

    // Функция для удаления альбома из библиотеки
    const handleRemoveFromLibrary = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем обработку события клика на родительском элементе

        if (!libraryStatus) {
            console.log(`[UniversalMusicAlbumItem] Альбом "${album.title}" (ID:${album.id}) не в библиотеке, нечего удалять`);
            return;
        }

        if (window.confirm('Вы уверены, что хотите удалить этот альбом из вашей библиотеки?')) {
            setIsAddingToLibrary(true); // Используем тот же индикатор загрузки
            try {
                console.log(`[UniversalMusicAlbumItem] Удаление альбома "${album.title}" (ID:${album.id}) из библиотеки...`);
                await MusicAlbumService.removeAlbumFromLibrary(album.id);
                
                // Обновляем состояние
                setIsInLib(false);
                setIsAddingToLibrary(false);
                
                if (onLibraryStatusChange) {
                    onLibraryStatusChange(false);
                }
                
                console.log(`[UniversalMusicAlbumItem] Альбом "${album.title}" (ID:${album.id}) успешно удален из библиотеки`);
            } catch (error: any) {
                console.error(`[UniversalMusicAlbumItem] Ошибка при удалении альбома "${album.title}" (ID:${album.id}) из библиотеки:`, error);
                alert(`Ошибка при удалении альбома: ${error.message || 'Неизвестная ошибка'}`);
                setIsAddingToLibrary(false);
            }
        }
    };

    // Определяем классы в зависимости от варианта отображения
    const albumItemClass = `${styles.albumItem} ${styles[variant]} ${isExpanded ? styles.expanded : ''} ${className}`.trim();

    // Проверяем, установлен ли статус (для отображения корректной кнопки)
    const libraryStatus = isInLib !== null ? isInLib : (album.isInLibrary !== undefined ? album.isInLibrary : isInLibrary);

    return (

        <div className={albumItemClass}>

            <div className={styles.albumHeader} onClick={handleAlbumClick}>

                <div className={styles.albumCoverContainer}>
                    <Link to={`/music/albums/${album.id}`}>
                        <div className={styles.albumCover}>
                            <img
                                src={album.coverUrl || DEFAULT_COVER_URL}
                                alt={album.title}
                                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COVER_URL }}
                            />
                        </div>
                        <div className={styles.overlay}>
                            <LibraryMusic className={styles.playIcon} />
                        </div>
                    </Link>
                </div>

                <div className={styles.albumInfo}>
                    <Link to={`/music/albums/${album.id}`}>
                        <div className={styles.albumTitle}>{album.title}</div>
                        <div className={styles.albumTracksCount}>
                            {album.tracksCount} {getTrackCountText(album.tracksCount)}
                        </div>
                    </Link>
                </div>

                <div className={styles.albumControls}>
                    <button
                        className={styles.playButton}
                        onClick={handlePlayAllTracks}
                        title="Воспроизвести все треки"
                    >
                        <LibraryMusic />
                    </button>
                    <button
                        className={`${styles.addToLibraryButton} ${libraryStatus ? styles.inLibrary : ''}`}
                        onClick={libraryStatus ? handleRemoveFromLibrary : handleAddToLibrary}
                        disabled={isAddingToLibrary}
                        title={libraryStatus ? "Удалить из библиотеки" : "Добавить в библиотеку"}
                    >
                        {isAddingToLibrary ? <Spinner /> : (libraryStatus ? <PlaylistAddCheck /> : <PlaylistAdd />)}
                    </button>
                    <button
                        className={styles.expandButton}
                        onClick={toggleExpand}
                        title={isExpanded ? "Свернуть" : "Развернуть"}
                    >
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className={styles.tracksContainer}>
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <Spinner />
                        </div>
                    ) : error ? (
                        <div className={styles.errorContainer}>{error}</div>
                    ) : albumTracks.length === 0 ? (
                        <div className={styles.emptyContainer}>
                            <p>В этом альбоме нет треков</p>
                        </div>
                    ) : (
                        <div className={styles.tracksList}>
                            {albumTracks.map((track, index) => (
                                <UniversalTrackItem
                                    key={track.id}
                                    track={track}
                                    index={index + 1}
                                    variant="album"
                                    onPlayClick={() => handleTrackPlay(track)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

        </div>

    );
};

function getTrackCountText(count: number): string {
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

export default UniversalMusicAlbumItem; 