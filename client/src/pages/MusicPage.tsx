import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/Spinner/Spinner';
import styles from './MusicPage.module.css';
import { usePlayer } from '../contexts/PlayerContext';
import { useQueue } from '../contexts/QueueContext';
import UniversalTrackItem from '../components/UniversalTrackItem/UniversalTrackItem';
import UniversalMusicAlbumItem from '../components/UniversalAlbumItem/UniversalAlbumItem';
import { MusicService } from '../services/music.service';
import { MusicAlbumService } from '../services/music-album.service';
import { Search as SearchIcon, Add as AddIcon, Remove as RemoveIcon, LibraryMusic, QueueMusic, Audiotrack, Close as CloseIcon, Person } from '@mui/icons-material';
import { Link, useParams, useLocation } from 'react-router-dom';
import UploadAudio, { MultiUploadAudio } from '../components/UploadAudio';
import CreateAlbumModal from '../components/MusicAlbum/CreateAlbumModal';
import { api } from '../utils/api';

// Получаем URL API из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || '/api';
const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || '/api/media';

const PRIMARY_ICON_SIZE = 24;
const SECONDARY_ICON_SIZE = 18;

interface Track {
    id: number;
    title: string;
    artist: string;
    duration: string;
    coverUrl: string;
    audioUrl: string;
    playCount: number;
}

interface MusicAlbum {
    id: number;
    title: string;
    description?: string;
    userId: number;
    coverUrl?: string;
    tracksCount: number;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
    tracks?: Track[];
    isInLibrary?: boolean;
}

interface PaginationInfo {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
    isLoading: boolean;
    lastFetchTime: number;
}

const MusicPage: React.FC = () => {
    const { user } = useAuth();
    const { userId: urlUserId } = useParams<{ userId?: string }>();
    const location = useLocation();
    
    // Определяем, просматриваем ли мы музыку другого пользователя
    const isViewingOtherUser = !!urlUserId && urlUserId !== String(user?.id);
    const targetUserId = isViewingOtherUser ? parseInt(urlUserId) : user?.id;
    
    const [otherUserName, setOtherUserName] = useState<string>('');
    const [createAlbumBlock, setCreateAlbumBlock] = useState(false);
    const [isCreateAlbumModalOpen, setIsCreateAlbumModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAlbums, setIsLoadingAlbums] = useState(true);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [albums, setAlbums] = useState<MusicAlbum[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        libraryTracks: Track[],
        serverTracks: Track[]
    }>({ libraryTracks: [], serverTracks: [] });

    // Обновленная структура пагинации с контролем состояния загрузки
    const [pagination, setPagination] = useState<PaginationInfo>({
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
        hasMore: false,
        isLoading: false,
        lastFetchTime: 0
    });

    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Используем рефы для отслеживания состояния загрузки и предотвращения повторных запросов
    const paginationRef = useRef<PaginationInfo>({
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
        hasMore: false,
        isLoading: false,
        lastFetchTime: 0
    });

    const requestIdRef = useRef<number>(0);
    const albumRequestInProgressRef = useRef<boolean>(false);
    const lastAlbumRequestTimeRef = useRef<number>(0);

    // Синхронизируем состояние пагинации с ref для доступа из обработчиков событий
    useEffect(() => {
        paginationRef.current = pagination;
    }, [pagination]);

    const {
        playTrack,
        currentTrack: playerTrack,
        isPlaying: playerIsPlaying,
        getTrackCover,
        addToQueue
    } = usePlayer();

    const { clearQueue, addTracksToQueue } = useQueue();

    // Функция для получения имени пользователя
    const fetchUserName = useCallback(async () => {
        if (isViewingOtherUser && targetUserId) {
            try {
                // Используем утилиту api вместо прямого fetch
                const userData = await api.get(`/users/${targetUserId}`);
                
                if (userData && userData.firstName) {
                    setOtherUserName(`${userData.firstName} ${userData.lastName || ''}`);
                } else {
                    setOtherUserName(`Пользователь №${targetUserId}`);
                }
            } catch (error) {
                console.error('Ошибка при получении данных пользователя:', error);
                setOtherUserName(`Пользователь №${targetUserId}`);
            }
        }
    }, [isViewingOtherUser, targetUserId]);

    // Полностью переработанная функция загрузки треков
    const fetchTracks = useCallback(async (page: number, resetData: boolean = false) => {
        // Генерируем уникальный идентификатор запроса
        const requestId = ++requestIdRef.current;

        // Проверяем, не выполняется ли уже загрузка
        if (paginationRef.current.isLoading) {
            console.log('⛔ Загрузка уже выполняется, пропускаем запрос');
            return;
        }

        // Проверяем время последнего запроса (минимум 1000 мс между запросами)
        const now = Date.now();
        if (now - paginationRef.current.lastFetchTime < 1000) {
            console.log(`⛔ Слишком частые запросы (${now - paginationRef.current.lastFetchTime}мс), пропускаем`);
            return;
        }

        // Проверяем, есть ли необходимость в загрузке дополнительных страниц
        if (page > 1 && !paginationRef.current.hasMore) {
            console.log('⛔ Нет больше страниц для загрузки, пропускаем запрос');
            return;
        }

        // Обновляем состояние пагинации перед запросом
        setPagination(prev => ({
            ...prev,
            isLoading: true,
            lastFetchTime: now
        }));

        // Обновляем состояние загрузки UI
        if (resetData) {
            setIsLoading(true);
        } else if (page > 1) {
            setIsLoadingMore(true);
        }

        try {
            console.log(`🔄 Запрос треков #${requestId}, страница ${page}, лимит ${paginationRef.current.limit}`);
            
            let result;
            
            // Используем разные методы в зависимости от того, чью музыку мы просматриваем
            if (isViewingOtherUser && targetUserId) {
                console.log(`Получаем треки пользователя ${targetUserId}`);
                result = await MusicService.getUserTracksByUserId(targetUserId, page, paginationRef.current.limit);
            } else {
                result = await MusicService.getUserTracksPaginated(page, paginationRef.current.limit);
            }

            // Проверяем, не был ли этот запрос отменен более новым
            if (requestIdRef.current > requestId) {
                console.log(`⚠️ Запрос #${requestId} был отменен более новым запросом #${requestIdRef.current}`);
                return;
            }

            console.log(`✅ Получены данные для запроса #${requestId}, страница ${page}:`, result);

            // Добавляем отладочные выводы
            console.log('🔍 Подробный анализ результата запроса:');
            if (result && typeof result === 'object') {
                console.log('- Структура result:', Object.keys(result));
                console.log('- result.tracks:', result.tracks);
                console.log('- result.tracks.length:', result.tracks ? result.tracks.length : 'undefined');
                console.log('- Тип result:', typeof result);
                console.log('- result instanceof Array:', Array.isArray(result));
            } else {
                console.log('- Результат запроса не определен или не является объектом:', result);
            }

            // Проверяем структуру ответа и извлекаем треки и информацию о пагинации
            const tracks = result?.tracks || [];
            console.log(`📦 Извлеченные треки (${tracks.length}):`, tracks);

            // Проверка на случай, если tracks пустой, но должен содержать данные
            if (tracks.length === 0 && result && typeof result === 'object' && 'tracks' in result) {
                console.warn('⚠️ Массив треков пуст, хотя результат содержит поле tracks:', result);
            }

            const totalTracks = result?.totalTracks || result?.pagination?.total || 0;
            const paginationData = result?.pagination || {
                total: totalTracks,
                page: page,
                limit: paginationRef.current.limit,
                pages: Math.ceil(totalTracks / paginationRef.current.limit),
                hasMore: (page * paginationRef.current.limit) < totalTracks
            };

            // Вычисляем, есть ли еще страницы
            const totalPages = paginationData.pages || Math.ceil(totalTracks / paginationRef.current.limit);
            const hasMorePages = paginationData.hasMore !== undefined
                ? paginationData.hasMore
                : (page < totalPages && tracks.length > 0);

            // Обновляем информацию о пагинации
            setPagination(prev => ({
                ...prev,
                total: totalTracks,
                page: page,
                pages: totalPages,
                hasMore: hasMorePages,
                isLoading: false
            }));

            // Логируем информацию о количестве треков
            console.log(`🎵 Получено треков: ${tracks.length}, всего: ${totalTracks}, страниц: ${totalPages}, hasMore: ${hasMorePages}`);

            // Обновляем список треков
            setTracks(prevTracks => {
                console.log('📋 Предыдущее состояние треков:', prevTracks);
                console.log('📋 Новые треки из запроса:', tracks);

                // При сбросе или первой странице заменяем полностью
                if (resetData || page === 1) {
                    console.log('📋 Полная замена треков:', tracks);
                    return [...tracks];
                }

                // Иначе добавляем только новые (уникальные) треки
                const existingIds = new Set(prevTracks.map(t => t.id));
                const newTracks = tracks.filter((track: Track) => !existingIds.has(track.id));

                console.log(`📋 Добавлено ${newTracks.length} новых треков (отфильтровано ${tracks.length - newTracks.length} дублей)`);

                // Если нет новых треков, отключаем hasMore
                if (newTracks.length === 0 && tracks.length > 0) {
                    setPagination(prev => ({ ...prev, hasMore: false }));
                    console.log('⚠️ Нет новых треков, отключаем hasMore');
                }

                const updatedTracks = [...prevTracks, ...newTracks];
                console.log('📋 Обновленный список треков:', updatedTracks);
                return updatedTracks;
            });

            setError(null);
        } catch (err) {
            console.error('❌ Ошибка при загрузке треков:', err);
            setError('Не удалось загрузить треки. Пожалуйста, попробуйте позже.');

            // Сбрасываем состояние загрузки в случае ошибки
            setPagination(prev => ({
                ...prev,
                isLoading: false
            }));
        } finally {
            // Сбрасываем все флаги загрузки UI
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [isViewingOtherUser, targetUserId]);

    // Загрузка альбомов
    const fetchAlbums = useCallback(async () => {
        // Если запрос уже выполняется, не делаем новый
        if (albumRequestInProgressRef.current) {
            console.warn('[MusicPage] Запрос альбомов уже выполняется, пропускаем дублирующий вызов fetchAlbums.');
            return;
        }
        
        albumRequestInProgressRef.current = true;
        setIsLoadingAlbums(true);
        
        try {
            let albumsData;
            
            // Используем разные методы в зависимости от того, чью музыку мы просматриваем
            if (isViewingOtherUser && targetUserId) {
                console.log(`Получаем альбомы пользователя ${targetUserId}`);
                albumsData = await MusicAlbumService.getUserAlbumsByUserId(targetUserId);
            } else {
                console.log('Получаем альбомы текущего пользователя');
                albumsData = await MusicAlbumService.getUserAlbumsByUserId('current');
            }
            
            // Проверяем, что albumsData существует и является массивом
            if (albumsData && Array.isArray(albumsData)) {
                // Устанавливаем значение isInLibrary по умолчанию для альбомов, где оно не определено
                const processedAlbums = albumsData.map((album: MusicAlbum) => ({
                    ...album,
                    isInLibrary: album.isInLibrary !== undefined ? album.isInLibrary : true
                }));
                
                console.log(`[MusicPage] Получено ${processedAlbums.length} альбомов, добавлено свойство isInLibrary где необходимо`);
                setAlbums(processedAlbums);
            } else {
                console.log('[MusicPage] Получены пустые данные альбомов:', albumsData);
                setAlbums([]);
            }
        } catch (err) {
            console.error('Ошибка при загрузке альбомов:', err);
            setError('Не удалось загрузить альбомы. Пожалуйста, попробуйте позже.');
        } finally {
            setIsLoadingAlbums(false);
            albumRequestInProgressRef.current = false;
        }
    }, [isViewingOtherUser, targetUserId]);

    // Поиск треков
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            // Если поиск пустой, возвращаем к обычному отображению
            setIsSearching(false);
            return;
        }

        try {
            setIsSearching(true);
            const results = await MusicService.searchTracks(searchQuery);
            setSearchResults(results);
        } catch (err) {
            console.error('Ошибка при поиске треков:', err);
            setError('Не удалось выполнить поиск. Пожалуйста, попробуйте позже.');
        }
    };

    // Загрузка данных при первоначальной загрузке страницы
    useEffect(() => {
        // Сбрасываем состояние пагинации
        setPagination({
            total: 0,
            page: 1,
            limit: 50,
            pages: 0,
            hasMore: false,
            isLoading: false,
            lastFetchTime: 0
        });

        // Загружаем первую страницу треков и альбомы
        fetchTracks(1, true);
        fetchAlbums();
        
        // Загружаем информацию о пользователе, если просматриваем чужую музыку
        if (isViewingOtherUser) {
            fetchUserName();
        }

        // Добавляем обработчик события beforeunload для сброса рефов при закрытии/обновлении страницы
        const handleBeforeUnload = () => {
            albumRequestInProgressRef.current = false;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [fetchTracks, fetchAlbums, fetchUserName, isViewingOtherUser]);

    // Улучшенная система отслеживания скролла с защитой от частых запросов
    useEffect(() => {
        // Используем throttle для ограничения частоты вызовов обработчика скролла
        let throttleTimeout: NodeJS.Timeout | null = null;
        const throttleDelay = 200; // мс

        const handleScroll = () => {
            // Если уже выполняется throttle, выходим
            if (throttleTimeout) return;

            // Устанавливаем таймаут для throttle
            throttleTimeout = setTimeout(() => {
                throttleTimeout = null;

                // Если идет загрузка или поиск, или больше нет страниц, не делаем запрос
                if (paginationRef.current.isLoading || isSearching || !paginationRef.current.hasMore) {
                    return;
                }

                // Вычисляем положение скролла
                const scrollPosition = window.innerHeight + window.scrollY;
                const documentHeight = document.documentElement.scrollHeight;
                const scrollThreshold = 0.85; // 85% высоты документа

                // Если достигнут порог прокрутки, загружаем следующую страницу
                if (scrollPosition >= documentHeight * scrollThreshold) {
                    const nextPage = paginationRef.current.page + 1;
                    console.log(`📜 Достигнут порог прокрутки (${Math.round(scrollPosition / documentHeight * 100)}%), загружаем страницу ${nextPage}`);
                    fetchTracks(nextPage, false);
                }
            }, throttleDelay);
        };

        // Добавляем обработчик скролла и очищаем его при размонтировании
        window.addEventListener('scroll', handleScroll);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (throttleTimeout) {
                clearTimeout(throttleTimeout);
            }
        };
    }, [fetchTracks, isSearching]);

    // Обработчик выбора трека для воспроизведения
    const handlePlayTrack = (track: Track) => {
        playTrack(track);
    };

    // Обработчик удаления трека
    const handleDeleteTrack = async (trackId: number, event: React.MouseEvent) => {
        event.stopPropagation();

        try {
            await MusicService.deleteTrack(trackId);

            // После успешного удаления перезагружаем текущую страницу
            fetchTracks(pagination.page, true);

        } catch (err) {
            console.error('Ошибка при удалении трека:', err);
            setError('Не удалось удалить трек. Пожалуйста, попробуйте позже.');
        }
    };

    // Обработчик загрузки нового трека
    const handleTrackUploaded = (track: Track) => {
        // При добавлении нового трека делаем полное обновление данных
        fetchTracks(1, true);
    };

    // Обработчик множественной загрузки треков
    const handleTracksUploaded = (newTracks: any[]) => {
        // При массовой загрузке треков перезагружаем данные
        fetchTracks(1, true);
    };

    // Обработчик выбора альбома
    const handleAlbumClick = (albumId: number) => {
        // Перенаправление на страницу альбома
        window.location.href = `/music/albums/${albumId}`;
    };

    // Обработчик воспроизведения альбома
    const handlePlayAlbum = async (albumId: number) => {
        try {
            const album = await MusicAlbumService.getAlbumById(albumId);
            if (album && album.tracks && album.tracks.length > 0) {
                clearQueue();
                addTracksToQueue(album.tracks);
                playTrack(album.tracks[0]);
            }
        } catch (err) {
            console.error('Ошибка при воспроизведении альбома:', err);
        }
    };

    // Обработчик формы поиска при нажатии Enter
    const handleSearchKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter') {
            handleSearch();
        }
    };

    // Функция для отмены поиска и возврата к обычному отображению
    const handleClearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    // Отображение основного содержимого
    const renderContent = () => {
        if (isSearching) {
            // Отображение результатов поиска
            return renderSearchResults();
        } else {
            // Отображение библиотеки пользователя
            return (
                <div className={styles.contentBlock}>
                    {renderAlbumsSection()}
                    {renderTracksSection()}
                </div>
            );
        }
    };

    // Отображение секции с альбомами
    const renderAlbumsSection = () => {
        return (
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <LibraryMusic className={styles.sectionIcon} />
                        Альбомы
                    </h2>
                    {!isViewingOtherUser && (
                        <button 
                            onClick={() => setIsCreateAlbumModalOpen(true)} 
                            className={`${styles.createAlbumButton}`}
                        >
                            <div className={styles.createAlbumButtonText}>
                                <AddIcon />
                                <h4 className={styles.createAlbumButtonLabel}>Создать альбом</h4>
                            </div>
                        </button>
                    )}
                </div>

                {isLoadingAlbums ? (
                    <div className={styles.loading}>
                        <Spinner />
                        <p>Загрузка альбомов...</p>
                    </div>
                ) : (
                    <div className={styles.albumsGrid}>
                        {/* Отображение существующих альбомов */}
                        {albums.map(album => (
                            <UniversalMusicAlbumItem
                                key={album.id}
                                album={album}
                                variant="grid"
                                onAlbumClick={() => handleAlbumClick(album.id)}
                                onLibraryStatusChange={(status) => {
                                    // При изменении статуса альбома в библиотеке обновляем список альбомов
                                    console.log(`Статус альбома "${album.title}" (ID:${album.id}) в библиотеке изменен: ${status ? 'Добавлен' : 'Удален'}`);
                                    fetchAlbums();
                                }}
                            />
                        ))}

                        {albums.length === 0 && !isLoadingAlbums && (
                            <div className={styles.emptyStateSmall}>
                                <p>{isViewingOtherUser ? `У пользователя пока нет публичных альбомов` : 'У вас пока нет созданных альбомов'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Отображение секции с треками
    const renderTracksSection = () => {
        console.log('🎵 Рендеринг секции треков:', {
            tracks: tracks,
            isLoading: isLoading,
            isLoadingMore: isLoadingMore,
            tracksLength: tracks.length,
            error: error,
            page: pagination.page,
            total: pagination.total,
            hasMore: pagination.hasMore
        });

        return (
            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        <Audiotrack className={styles.sectionIcon} />
                        {isViewingOtherUser ? `Музыка` : 'Моя музыка'}
                    </h2>
                </div>

                <div className={styles.trackListContainer}>
                    {isLoading && pagination.page === 1 ? (
                        <div className={styles.loading}>
                            <Spinner />
                            <p>Загрузка треков...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorMessage}>{error}</div>
                    ) : tracks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>{isViewingOtherUser ? `У пользователя пока нет загруженных треков` : 'У вас пока нет загруженных треков'}</p>
                            {!isViewingOtherUser && (
                                <>
                                    <p>Вы можете загрузить музыку двумя способами:</p>
                                    <ul className={styles.uploadOptionsList}>
                                        <li>Нажмите на кнопку "+" в правом нижнем углу, чтобы добавить один трек</li>
                                        <li>Нажмите на кнопку "Загрузить музыку" для множественной загрузки треков</li>
                                    </ul>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={styles.trackList}>
                            <div className={styles.trackListHeader}>
                                <div className={styles.trackCount}>
                                    Найдено: {pagination.total} {getPluralForm(pagination.total, 'трек', 'трека', 'треков')}
                                </div>
                            </div>

                            <div className={styles.tracksList}>
                                {tracks.map((track, index) => (
                                    <UniversalTrackItem
                                        key={track.id}
                                        track={track}
                                        isInLibrary={!isViewingOtherUser}
                                        onLibraryStatusChange={() => fetchTracks(1, true)}
                                        onPlayClick={() => handlePlayTrack(track)}
                                    />
                                ))}
                            </div>

                            {/* Индикатор загрузки дополнительных треков */}
                            {isLoadingMore && (
                                <div className={styles.loadingMore}>
                                    <Spinner />
                                    <p>Загрузка треков...</p>
                                </div>
                            )}

                            {/* Индикатор конца списка */}
                            {!isLoadingMore && !pagination.hasMore && tracks.length > 0 && (
                                <div className={styles.endOfList}>
                                    <span>Вы достигли конца списка ({pagination.total} {getPluralForm(pagination.total, 'трек', 'трека', 'треков')})</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // Отображение результатов поиска
    const renderSearchResults = () => {
        const { libraryTracks, serverTracks } = searchResults;
        const hasResults = libraryTracks.length > 0 || serverTracks.length > 0;

        return (
            <div className={styles.searchResults}>
                <div className={styles.searchResultsHeader}>
                    <h2 className={styles.searchResultsTitle}>
                        Результаты поиска: "{searchQuery}"
                    </h2>
                    <button
                        className={styles.clearSearchButton}
                        onClick={handleClearSearch}
                    >
                        Вернуться к библиотеке
                    </button>
                </div>

                {!hasResults && (
                    <div className={styles.emptyState}>
                        <p>По вашему запросу ничего не найдено</p>
                        <p>Попробуйте изменить поисковый запрос или проверьте написание</p>
                    </div>
                )}

                {libraryTracks.length > 0 && (
                    <div className={styles.searchSection}>
                        <h3 className={styles.searchSectionTitle}>В Вашей библиотеке</h3>
                        <div className={styles.tracksList}>
                            {libraryTracks.map((track) => (
                                <UniversalTrackItem
                                    key={`lib-${track.id}`}
                                    track={track}
                                    isInLibrary={true}
                                    onLibraryStatusChange={() => fetchTracks(1, true)}
                                    onPlayClick={() => handlePlayTrack(track)}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {serverTracks.length > 0 && (
                    <div className={styles.searchSection}>
                        <h3 className={styles.searchSectionTitle}>В сети</h3>
                        <div className={styles.tracksList}>
                            {serverTracks.map((track) => (
                                <UniversalTrackItem
                                    key={`server-${track.id}`}
                                    track={track}
                                    isInLibrary={false}
                                    onLibraryStatusChange={() => fetchTracks(1, true)}
                                    onPlayClick={() => handlePlayTrack(track)}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Вспомогательная функция для правильного склонения в зависимости от числа
    const getPluralForm = (count: number, form1: string, form2: string, form5: string): string => {
        const lastDigit = count % 10;
        const lastTwoDigits = count % 100;

        if (lastDigit === 1 && lastTwoDigits !== 11) {
            return form1;
        }

        if (lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 10 || lastTwoDigits >= 20)) {
            return form2;
        }

        return form5;
    };

    const handleAlbumCreated = (albumId: number) => {
        console.log(`Альбом с ID ${albumId} успешно создан`);
        // Обновляем список альбомов после создания
        fetchAlbums();
    };

    return (
        <div className={styles.musicPage}>
            {isViewingOtherUser && (
                <div className={styles.otherUserHeader}>
                    <div className={styles.otherUserInfo}>
                        <Person className={styles.userIcon} />
                        <h1 className={styles.otherUserName}>
                            {otherUserName || `Пользователь №${targetUserId}`}
                        </h1>
                    </div>
                </div>
            )}
        
            {/* Поисковая строка */}
            {!isViewingOtherUser && (
                <div className={styles.searchContainer}>
                    <div className={styles.searchInputContainer}>
                        <SearchIcon className={styles.searchIcon} />
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Поиск треков..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={handleSearchKeyDown}
                            ref={searchInputRef}
                        />
                        {searchQuery && (
                            <button
                                className={styles.clearSearchInputButton}
                                onClick={() => setSearchQuery('')}
                            >
                                <CloseIcon sx={{ 
                                        fontSize: SECONDARY_ICON_SIZE,
                                        color: 'var(--vseti-color-text-muted)'
                                    }} />
                            </button>
                        )}
                    </div>
                    <button
                        className={`${styles.searchButton} ${!searchQuery ? styles.disabled : ''}`}
                        onClick={handleSearch}
                        disabled={!searchQuery}
                    >
                        Найти
                    </button>
                </div>
            )}

            {/* Основной контент страницы */}
            {renderContent()}

            {/* Модальное окно создания альбома */}
            {!isViewingOtherUser && (
                <CreateAlbumModal
                    isOpen={isCreateAlbumModalOpen}
                    onClose={() => setIsCreateAlbumModalOpen(false)}
                    onAlbumCreated={handleAlbumCreated}
                    availableTracks={tracks}
                    userId={user?.id}
                />
            )}

            {/* Плавающая кнопка добавления */}
            {!isViewingOtherUser && (
                <UploadAudio
                    onTrackUploaded={handleTrackUploaded}
                    maxFileSize={100 * 1024 * 1024} // 100 МБ
                >
                    <div className={styles.floatingAddButton}>
                        <AddIcon />
                    </div>
                </UploadAudio>
            )}

            {/* Кнопка для массовой загрузки треков */}
            {!isViewingOtherUser && (
                <MultiUploadAudio
                    onTracksUploaded={handleTracksUploaded}
                    maxFileSize={100 * 1024 * 1024} // 100 МБ
                >
                    <button className={styles.multiUploadButton}>
                        Загрузить музыку
                    </button>
                </MultiUploadAudio>
            )}
        </div>
    );
};

export default MusicPage; 