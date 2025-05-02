import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/Spinner/Spinner';
import styles from './MusicPage.module.css';
import { Track as DemoTrack, getDemoTracks } from './demoTracks';
import AuPlayerWrap from '../components/AuPlayer/wrap/AuPlayWrap';
import AuOrder from '../components/AuPlayer/AuOrder';
import { usePlayer } from '../contexts/PlayerContext';
import UploadAudio, { MultiUploadAudio } from '../components/UploadAudio';
import { Link } from 'react-router-dom';
import { tokenService } from '../utils/api';
import UniversalTrackItem from '../components/UniversalTrackItem/UniversalTrackItem';
import { MusicService } from '../services/music.service';
import { Search as SearchIcon } from '@mui/icons-material';
// Получаем URL API из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || '/api';
const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || '/api/media';

interface Track {
    id: number;
    title: string;
    artist: string;
    duration: string;
    coverUrl: string;
    audioUrl: string;
    playCount: number;
}

interface PaginationInfo {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
}

// Перечисление для вкладок
enum TabType {
    MyMusic = 'my-music',
    Queue = 'queue',
    Albums = 'albums',
    Search = 'search'
}

export const MusicPage: React.FC = () => {
    const { user } = useAuth();
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [tracks, setTracks] = useState<Track[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);
    const [debugVisible, setDebugVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadingTrack, setUploadingTrack] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [coverError, setCoverError] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>(TabType.MyMusic);
    const [expandedView, setExpandedView] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [volume, setVolume] = useState(1);
    const [showVolumeControl, setShowVolumeControl] = useState(false);
    const [pagination, setPagination] = useState<PaginationInfo>({
        total: 0,
        page: 1,
        limit: 50,
        pages: 0,
        hasMore: false
    });
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    // Состояние для поиска
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        libraryTracks: Track[],
        serverTracks: Track[]
    }>({ libraryTracks: [], serverTracks: [] });
    
    const { 
        playTrack, 
        currentTrack: playerTrack, 
        isPlaying: playerIsPlaying, 
        getTrackCover,
        tracks: queueTracks,
        setTracks: setQueueTracks,
        addToQueue,
        audio
    } = usePlayer();

    useEffect(() => {
        fetchTracks(1, true);
    }, []);

    useEffect(() => {
        // Обработчик скролла для ленивой загрузки на уровне окна
        const handleScroll = () => {
            // Проверяем нужно ли загружать дополнительные треки
            if (activeTab !== TabType.MyMusic || !pagination.hasMore || isLoadingMore || isLoading) {
                return;
            }

            // Проверяем, насколько пользователь прокрутил страницу
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // Отображаем контроль громкости, если страница прокручена больше чем на 200px
            setShowVolumeControl(scrollTop > 200);
            
            // Если пользователь прокрутил почти до конца страницы, загружаем еще треки
            // Увеличиваем порог для более раннего начала загрузки
            if (documentHeight - scrollTop - windowHeight < 500) {
                loadMoreTracks();
            }
        };

        // Привязываем обработчик скролла к окну
        window.addEventListener('scroll', handleScroll);

        return () => {
            // Удаляем обработчик при размонтировании
            window.removeEventListener('scroll', handleScroll);
        };
    }, [activeTab, pagination.hasMore, isLoadingMore, isLoading, pagination.page]);

    useEffect(() => {
        if (currentTrack && audioRef.current) {
            try {
                console.log('[Music] Установка аудио источника:', currentTrack.audioUrl);
                audioRef.current.src = currentTrack.audioUrl;
                
                audioRef.current.onerror = ((e: Event) => {
                    console.error('Ошибка воспроизведения аудио:', e);
                    const audioElement = audioRef.current;
                    if (audioElement && audioElement.error) {
                        console.error('Код ошибки:', audioElement.error.code);
                        console.error('Сообщение ошибки:', audioElement.error.message);
                        
                        // Показываем более информативное сообщение об ошибке
                        let errorMessage = 'Не удалось воспроизвести трек: ' + currentTrack.title;
                        switch (audioElement.error.code) {
                            case MediaError.MEDIA_ERR_ABORTED:
                                errorMessage += ' (воспроизведение прервано)';
                                break;
                            case MediaError.MEDIA_ERR_NETWORK:
                                errorMessage += ' (сетевая ошибка)';
                                break;
                            case MediaError.MEDIA_ERR_DECODE:
                                errorMessage += ' (ошибка декодирования)';
                                break;
                            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                                errorMessage += ' (формат не поддерживается)';
                                break;
                        }
                        
                        alert(errorMessage);
                    } else {
                        alert('Не удалось воспроизвести трек: ' + currentTrack.title);
                    }
                    setIsPlaying(false);
                }) as OnErrorEventHandler;
                
                if (isPlaying) {
                    const playPromise = audioRef.current.play();
                    
                    if (playPromise !== undefined) {
                        playPromise.catch(error => {
                            console.error('[Music] Ошибка воспроизведения:', error);
                            setIsPlaying(false);
                        });
                    }
                } else {
                    audioRef.current.pause();
                }
            } catch (error) {
                console.error('[Music] Ошибка при настройке аудио:', error);
                setIsPlaying(false);
            }
        }
    }, [currentTrack, isPlaying]);

    useEffect(() => {
        setCoverError(false);
    }, [playerTrack?.id]);

    const handleBackgroundCoverError = () => {
        console.warn('[MusicPage] Ошибка загрузки фоновой обложки:', playerTrack?.coverUrl);
        setCoverError(true);
    };

    const fetchTracks = (page = 1, resetTracks = false) => {
        if (resetTracks) {
            setTracks([]);
            setError(null);
        }
        
        setIsLoading(resetTracks);
        setIsLoadingMore(page > 1);
        
        // Получаем токен из tokenService
        const token = tokenService.getToken();
        
        // Загружаем все треки сразу, увеличив лимит
        fetch(`${API_URL}/music?page=${page}&limit=1000`, {
            headers: {
                'Accept': 'application/json',
                // Добавляем токен в заголовок Authorization, если он есть
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            // Удаляем credentials: 'include', так как теперь используем токены, а не куки
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ошибка: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('[Music] Получены треки:', data);
                
                // Валидация данных
                const validatedTracks = data.tracks.map((track: any) => {
                    const validTrack: Track = {
                        id: track.id || 0,
                        title: track.title || 'Неизвестный трек',
                        artist: track.artist || 'Неизвестный исполнитель',
                        duration: track.duration || 0,
                        coverUrl: track.coverUrl || '/api/music/cover/default.png',
                        // Для трека с сервера используем файловый маршрут
                        audioUrl: track.filename ? `${API_URL}/music/file/${track.filename}` : '',
                        playCount: track.playCount || 0
                    };
                    
                    // Проверяем наличие аудио URL
                    if (!validTrack.audioUrl) {
                        console.warn(`[Music] Трек ${validTrack.title} (ID: ${validTrack.id}) не имеет аудио URL`);
                    }
                    
                    return validTrack;
                });
                
                // Обновляем список треков
                if (resetTracks) {
                    setTracks(validatedTracks);
                } else {
                    setTracks(prevTracks => [...prevTracks, ...validatedTracks]);
                }
                
                // Одновременно обновляем и очередь воспроизведения в плеере
                if (resetTracks) {
                    console.log(`[Music] Добавляем в очередь все ${validatedTracks.length} треков`);
                    setQueueTracks([...validatedTracks]);
                }
                
                // Обновляем информацию о пагинации
                setPagination(data.pagination);
            })
            .catch(err => {
                console.error('[Music] Ошибка при загрузке треков:', err);
                setError(`Не удалось загрузить треки: ${err.message}`);
            })
            .finally(() => {
                setIsLoading(false);
                setIsLoadingMore(false);
            });
    };
    
    // Функция для загрузки дополнительных треков
    const loadMoreTracks = () => {
        if (pagination.hasMore && !isLoadingMore) {
            const nextPage = pagination.page + 1;
            console.log(`[Music] Загрузка дополнительных треков, страница ${nextPage}`);
            fetchTracks(nextPage, false);
        }
    };

    // Обработчик для выбора трека из списка "Моя музыка"
    const handleSelectTrack = async (track: Track) => {
        console.log('[Music] Выбран трек из списка:', track);
        
        try {
            // Загружаем все треки пользователя без пагинации
            setIsLoading(true);
            
            // Получаем токен из tokenService
            const token = tokenService.getToken();
            
            const response = await fetch(`${API_URL}/music?limit=1000`, {
                headers: {
                    'Accept': 'application/json',
                    // Добавляем токен в заголовок Authorization, если он есть
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                // Удаляем credentials: 'include', так как теперь используем токены, а не куки
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ошибка: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('[Music] Загружены все треки для очереди:', data);
            
            // Преобразуем все треки в нужный формат
            const allTracks = data.tracks.map((trackData: any) => {
                return {
                    id: trackData.id || 0,
                    title: trackData.title || 'Неизвестный трек',
                    artist: trackData.artist || 'Неизвестный исполнитель',
                    duration: trackData.duration || '0:00',
                    coverUrl: trackData.coverUrl || '/api/music/cover/default.png',
                    audioUrl: trackData.filename ? `${API_URL}/music/file/${trackData.filename}` : '',
                    playCount: trackData.playCount || 0
                };
            });
            
            console.log(`[Music] Добавляем в очередь все ${allTracks.length} треков`);
            
            // Полностью заменяем очередь
            setQueueTracks([...allTracks]);
            
            // Находим выбранный трек в полном списке
            const selectedTrack = allTracks.find((t: Track) => t.id === track.id) || track;
            
            // Запускаем воспроизведение
            console.log('[Music] Начинаем воспроизведение трека:', selectedTrack);
            playTrack(selectedTrack);
            
        } catch (error) {
            console.error('[Music] Ошибка при загрузке всех треков для очереди:', error);
            // Если произошла ошибка, используем текущие загруженные треки
            setQueueTracks([...tracks]);
            playTrack(track);
        } finally {
            setIsLoading(false);
        }
    };

    // Обработчик для добавления трека в очередь без воспроизведения
    const handleAddToQueue = (track: Track, e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем выбор трека для воспроизведения
        
        // Проверяем, есть ли уже такой трек в очереди
        const trackExists = queueTracks.some(t => t.id === track.id);
        
        if (!trackExists) {
            console.log('[Music] Добавление трека в очередь:', track);
            addToQueue(track);
                } else {
            console.log('[Music] Трек уже в очереди:', track);
        }
    };

    const handleDeleteTrack = async (trackId: number, e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем запуск трека при удалении
        
        if (!window.confirm('Вы уверены, что хотите удалить этот трек?')) {
            return;
        }
        
        try {
            // Получаем токен из tokenService
            const token = tokenService.getToken();
            
            const response = await fetch(`${API_URL}/music/${trackId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    // Добавляем токен в заголовок Authorization, если он есть
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                // Удаляем credentials: 'include', так как теперь используем токены, а не куки
            });
            
            if (response.ok) {
                // Удаляем трек из списка треков
                setTracks(prev => prev.filter(track => track.id !== trackId));
                
                // Также удаляем его из очереди, если он там есть
                setQueueTracks(prev => prev.filter(track => track.id !== trackId));
                
                // Обновляем информацию о пагинации
                setPagination(prev => ({
                    ...prev,
                    total: Math.max(0, prev.total - 1),
                    pages: Math.max(1, Math.ceil((prev.total - 1) / prev.limit))
                }));
                
                // Проверяем, нужно ли подгрузить дополнительные треки
                if (tracks.length < 5 && pagination.hasMore) {
                    loadMoreTracks();
                }
            } else {
                console.error('Ошибка при удалении трека');
            }
        } catch (error) {
            console.error('Ошибка при удалении трека:', error);
        }
    };

    // Обработчик для удаления всех треков пользователя
    const handleDeleteAllTracks = async (e: React.MouseEvent) => {
        e.stopPropagation();
        
        // Проверяем, есть ли треки для удаления
        if (pagination.total === 0 || tracks.length === 0) {
            alert('У вас нет треков для удаления');
            return;
        }
        
        // Запрашиваем подтверждение у пользователя
        const confirmation = window.confirm(`Вы уверены, что хотите удалить все треки (${pagination.total})? Это действие нельзя отменить.`);
        
        if (!confirmation) {
            return;
        }
        
        try {
            // Получаем токен из tokenService
            const token = tokenService.getToken();
            
            const response = await fetch(`${API_URL}/music/user/all`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    // Добавляем токен в заголовок Authorization, если он есть
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                // Удаляем credentials: 'include', так как теперь используем токены, а не куки
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка HTTP: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('[Music] Результат удаления всех треков:', result);
            
            // Обновляем список треков
            setTracks([]);
            
            // Сбрасываем пагинацию
            setPagination({
                total: 0,
                page: 1,
                limit: pagination.limit,
                pages: 0,
                hasMore: false
            });
            
            // Показываем сообщение об успешном удалении
            alert(`Удалено ${result.deletedCount} треков`);
            
        } catch (error) {
            console.error('[Music] Ошибка при удалении всех треков:', error);
            alert(`Ошибка при удалении треков: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
        }
    };

    // Обработчик для добавления нового трека после загрузки
    const handleTrackUploaded = (newTrack: Track) => {
        console.log('[Music] Добавлен новый трек:', newTrack);
        
        // Добавляем трек в начало списка
        setTracks(prev => [newTrack, ...prev]);
        
        // Обновляем информацию о пагинации
        setPagination(prev => ({
            ...prev,
            total: prev.total + 1,
            pages: Math.ceil((prev.total + 1) / prev.limit)
        }));
    };

    // Обработчик для множественной загрузки треков
    const handleTracksUploaded = (newTracks: any[]) => {
        console.log(`[Music] Добавлено ${newTracks.length} новых треков`);
        
        // Конвертируем в формат Track
        const convertedTracks: Track[] = newTracks.map(track => ({
            id: track.id || 0,
            title: track.title || 'Неизвестный трек',
            artist: track.artist || 'Неизвестный исполнитель',
            duration: track.duration || '0:00',
            coverUrl: track.coverUrl || '/api/music/cover/default.png',
            audioUrl: track.filename ? `${API_URL}/music/file/${track.filename}` : '',
            playCount: track.playCount || 0
        }));
        
        // Добавляем треки в начало списка
        setTracks(prev => [...convertedTracks, ...prev]);
        
        // Обновляем информацию о пагинации
        setPagination(prev => ({
            ...prev,
            total: prev.total + convertedTracks.length,
            pages: Math.ceil((prev.total + convertedTracks.length) / prev.limit)
        }));
        
        // Добавляем их в очередь плеера
        if (convertedTracks.length > 0) {
            setQueueTracks(prev => [...convertedTracks, ...prev]);
        }
    };

    // Вкладка "Моя музыка"
    const renderMyMusicTab = () => {
        return (
            <div className={`${styles.myMusicTab} ${expandedView ? styles.expanded : ''}`}>
                <div className={styles.myMusicHeader}>
                    <h2>Моя музыка</h2>
                    <div className={styles.myMusicActions}>
                        <button 
                            className={styles.deleteAllButton} 
                            onClick={handleDeleteAllTracks}
                            title="Удалить все треки"
                            disabled={isLoading || tracks.length === 0}
                        >
                            Удалить все треки
                        </button>
                    </div>
                </div>
                
                <div className={styles.trackListContainer}>
                    {isLoading && pagination.page === 1 ? (
                        <div className={styles.loading}>
                            <Spinner />
                            <p>Загрузка ваших треков...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorMessage}>
                            {error}
                        </div>
                    ) : tracks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>У вас пока нет загруженных треков</p>
                            <p>Вы можете загрузить музыку двумя способами:</p>
                            <ul className={styles.uploadOptionsList}>
                                <li>Нажмите на кнопку "+" в правом нижнем углу, чтобы добавить один трек</li>
                                <li>Нажмите на кнопку "Загрузить музыку" для множественной загрузки треков</li>
                            </ul>
                        </div>
                    ) : (
                        <div className={styles.trackList}>
                            <div className={styles.trackListHeader}>
                                <div className={styles.trackCount}>
                                    Найдено: {pagination.total} {pagination.total === 1 ? 'трек' : 
                                              pagination.total < 5 ? 'трека' : 'треков'}
                                </div>
                            </div>
                            
                            <div className={styles.tracksList}>
                                {tracks.map((track, index) => (
                                    <UniversalTrackItem
                                        key={track.id}
                                        track={track}
                                        isInLibrary={true}
                                        onLibraryStatusChange={() => fetchTracks(1, true)}
                                        onPlayClick={() => handleSelectTrack(track)}
                                        onRemove={(trackId) => handleDeleteTrack(trackId, new MouseEvent('click') as any)}
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
                                    <p>Вы дошли до конца списка</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };
    
    // Вкладка "Очередь"
    const renderQueueTab = () => {
        if (queueTracks.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <p>Очередь воспроизведения пуста</p>
                    <p>Добавьте треки из раздела "Моя музыка"</p>
                </div>
            );
        }
        
        return (
            <div className={styles.queueContainer}>
                <div className={styles.queueHeader}>
                    <div className={styles.trackCount}>
                        В очереди: {queueTracks.length} {queueTracks.length === 1 ? 'трек' : 
                                   queueTracks.length < 5 ? 'трека' : 'треков'}
                    </div>
                </div>
                
                <div className={styles.tracksList}>
                    {queueTracks.map((track) => (
                        <UniversalTrackItem
                            key={track.id}
                            track={track}
                            variant="queue"
                            isInLibrary={true}
                            onLibraryStatusChange={() => fetchTracks(1, true)}
                            onPlayClick={() => playTrack(track)}
                            onRemove={(trackId) => {
                                // Удаляем трек из очереди по ID
                                setQueueTracks(prev => prev.filter(t => t.id !== trackId));
                            }}
                        />
                    ))}
                </div>
            </div>
        );
    };

    // Переключение между обычным и расширенным режимом
    const toggleViewMode = () => {
        setExpandedView(!expandedView);
    };

    // Получаем URL обложки для фона
    const coverUrl = playerTrack ? (coverError ? '/api/music/cover/default.png' : getTrackCover(playerTrack.coverUrl)) : '';

    // Инициализация громкости
    useEffect(() => {
        if (audio) {
            setVolume(audio.volume);
        }
    }, [audio]);

    // Обработчик изменения громкости
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audio) {
            audio.volume = newVolume;
        }
    };

    // Функция для выполнения поиска
    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            setSearchResults({ libraryTracks: [], serverTracks: [] });
            return;
        }
        
        setIsSearching(true);
        try {
            const results = await MusicService.searchTracks(searchQuery);
            setSearchResults(results);
            
            // Если есть результаты, переключаемся на вкладку поиска
            if (activeTab !== TabType.Search) {
                setActiveTab(TabType.Search);
            }
        } catch (error) {
            console.error('Ошибка при выполнении поиска:', error);
            // Можно добавить обработку ошибки, например показать уведомление
        } finally {
            setIsSearching(false);
        }
    };
    
    // Обработчик изменения поискового запроса
    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };
    
    // Обработчик нажатия Enter в поисковой строке
    const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Рендер вкладки с результатами поиска
    const renderSearchTab = () => {
        if (isSearching) {
            return (
                <div className={styles.loadingContainer}>
                    <Spinner />
                    <p>Выполняется поиск...</p>
                </div>
            );
        }
        
        const { libraryTracks, serverTracks } = searchResults;
        const totalResults = libraryTracks.length + serverTracks.length;
        
        if (searchQuery.trim() === '') {
            return (
                <div className={styles.emptyState}>
                    <p>Введите поисковый запрос, чтобы найти треки</p>
                </div>
            );
        }
        
        if (totalResults === 0) {
            return (
                <div className={styles.emptyState}>
                    <p>По запросу "{searchQuery}" ничего не найдено</p>
                </div>
            );
        }
        
        return (
            <div className={styles.searchResults}>
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
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Если страница загружается в первый раз, показываем индикатор загрузки
    if (isLoading && tracks.length === 0 && queueTracks.length === 0) {
        return (
            <div className={styles.centeredContainer}>
                <div className={styles.loading}>
                    <Spinner />
                    <p>Загрузка музыки...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`${expandedView ? styles.expandedMode : ''}`}>
            <div className={styles.container}>
                {playerTrack && (
                    <>
                        <div 
                            className={styles.backgroundCover} 
                            style={{ 
                                backgroundImage: `url(${coverUrl})`,
                                opacity: playerIsPlaying ? 0.3 : 0.15
                            }}
                        />
                        {/* Невидимое изображение для отслеживания ошибок загрузки */}
                        <img 
                            src={coverUrl} 
                            onError={handleBackgroundCoverError} 
                            style={{ display: 'none' }} 
                            alt="" 
                        />
                    </>
                )}
                <div className={styles.header}>
                    <h1 className={styles.title}>Музыка</h1>
                    <p className={styles.subtitle}>Слушайте и добавляйте в плейлисты</p>
                    
                    {/* Поисковая строка */}
                    <div className={styles.searchContainer}>
                        <input
                            type="text"
                            className={styles.searchInput}
                            placeholder="Поиск треков..."
                            value={searchQuery}
                            onChange={handleSearchInputChange}
                            onKeyDown={handleSearchKeyDown}
                        />
                        <button 
                            className={styles.searchButton}
                            onClick={handleSearch}
                            disabled={isSearching}
                        >
                            <SearchIcon />
                        </button>
                    </div>
                        
                    {/* Кнопка переключения режима отображения */}
                    <button 
                        className={styles.viewModeToggle}
                        onClick={toggleViewMode}
                        title={expandedView ? "Список треков" : "Расширенный плеер"}
                    >
                        {expandedView ? (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                            </svg>
                        )}
                    </button>
                </div>

                {debugVisible && debugInfo && (
                    <div className={styles.debugPanel}>
                        <div className={styles.debugHeader}>
                            <h3>Отладочная информация</h3>
                            <button onClick={() => setDebugVisible(false)}>Закрыть</button>
                        </div>
                        <pre className={styles.debugContent}>{debugInfo}</pre>
                    </div>
                )}

                <div className={styles.content}>
                    <div className={styles.tabs}>
                        <button 
                            className={`${styles.tab} ${activeTab === TabType.MyMusic ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(TabType.MyMusic)}
                        >
                            Моя музыка
                        </button>
                        <button 
                            className={`${styles.tab} ${activeTab === TabType.Queue ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(TabType.Queue)}
                        >
                            Очередь {queueTracks.length > 0 ? `(${queueTracks.length})` : ''}
                        </button>
                        <button 
                            className={`${styles.tab} ${activeTab === TabType.Albums ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(TabType.Albums)}
                        >
                            Альбомы
                        </button>
                        <button 
                            className={`${styles.tab} ${activeTab === TabType.Search ? styles.tabActive : ''}`}
                            onClick={() => setActiveTab(TabType.Search)}
                        >
                            Поиск
                        </button>
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === TabType.MyMusic ? renderMyMusicTab() : activeTab === TabType.Queue ? renderQueueTab() : activeTab === TabType.Albums ? (
                            <div className={styles.tabContent}>
                                <div className={styles.albumsGrid}>
                                    <div className={styles.album}>
                                        <Link to="/music/albums/create" className={styles.createAlbumLink}>
                                            <div className={styles.createAlbumTile}>
                                                <div className={styles.createAlbumIcon}>+</div>
                                                <div className={styles.createAlbumLabel}>Создать альбом</div>
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        ) : renderSearchTab()}
                    </div>
                </div>

                {/* Добавляем компонент загрузки аудио */}
                <UploadAudio onTrackUploaded={handleTrackUploaded} />
                
                {/* Добавляем компонент множественной загрузки музыки */}
                <MultiUploadAudio onTracksUploaded={handleTracksUploaded} />

                {/* Аудио плеер - передаем флаг expandedMode */}
                <div className={styles.playerContainer}>
                    <div className={expandedView ? styles.playerExpanded : ''}>
                        <AuPlayerWrap expandedMode={expandedView} />
                    </div>
                </div>

                {/* Фиксированный контроль громкости */}
                {showVolumeControl && (
                    <div className={styles.volumeControlFixed}>
                        <div className={styles.volumeIcon}>
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d={
                                    volume === 0 
                                        ? "M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
                                        : volume < 0.5
                                        ? "M7 9v6h4l5 5V4l-5 5H7z"
                                        : "M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                                } />
                            </svg>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                            aria-label="Громкость"
                            className={styles.volumeSliderFixed}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}; 