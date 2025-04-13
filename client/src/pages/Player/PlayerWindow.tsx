import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { usePlayerWindow } from '../../contexts/PlayerWindowContext';
import { Track } from '../../types/music.types';
import styles from './PlayerWindow.module.css';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';

// Константа для обложки по умолчанию
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

// Навигационные компоненты
const IconBack = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6"/>
  </svg>
);

const IconForward = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6"/>
  </svg>
);

// Простые SVG компоненты для иконок (с более тонкими линиями)
const IconShuffle = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8"></polyline>
    <line x1="4" y1="20" x2="21" y2="3"></line>
    <polyline points="21 16 21 21 16 21"></polyline>
    <line x1="15" y1="15" x2="21" y2="21"></line>
    <line x1="4" y1="4" x2="9" y2="9"></line>
  </svg>
);

const IconSkipPrevious = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="19 20 9 12 19 4 19 20"></polygon>
    <line x1="5" y1="19" x2="5" y2="5"></line>
  </svg>
);

const IconPause = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="4" width="4" height="16"></rect>
    <rect x="14" y="4" width="4" height="16"></rect>
  </svg>
);

const IconPlay = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: "4px" }}>
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>
);

const IconSkipNext = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 4 15 12 5 20 5 4"></polygon>
    <line x1="19" y1="5" x2="19" y2="19"></line>
  </svg>
);

const IconRepeat = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 1 21 5 17 9"></polyline>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <polyline points="7 23 3 19 7 15"></polyline>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
  </svg>
);

const IconRepeatOne = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 1l4 4-4 4"></path>
    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
    <path d="M7 23l-4-4 4-4"></path>
    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
    <path d="M12 17V7"></path>
    <path d="M12 7h2"></path>
  </svg>
);

const IconVolumeX = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <line x1="23" y1="9" x2="17" y2="15"></line>
    <line x1="17" y1="9" x2="23" y2="15"></line>
  </svg>
);

const IconVolumeLow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>
);

const IconVolumeHigh = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
  </svg>
);

const ACTIVE_PLAYER_STORAGE_KEY = 'master_player';

// Иконка для активного трека
const IconPlayingNow = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polygon points="10 8 16 12 10 16 10 8"></polygon>
  </svg>
);

// Добавляем иконку для очереди
const IconQueue = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"></line>
    <line x1="8" y1="12" x2="21" y2="12"></line>
    <line x1="8" y1="18" x2="21" y2="18"></line>
    <line x1="3" y1="6" x2="3.01" y2="6"></line>
    <line x1="3" y1="12" x2="3.01" y2="12"></line>
    <line x1="3" y1="18" x2="3.01" y2="18"></line>
  </svg>
);

// Добавляем иконку для возврата к плееру
const IconBackToPlayer = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polygon points="10 8 16 12 10 16 10 8"></polygon>
  </svg>
);

// Компонент для отображения очереди воспроизведения
interface QueueViewProps {
    queue: any[];
    currentTrack: any;
    onTrackSelect: (index: number) => void;
    onBackToPlayer: () => void;
    onRemoveTrack: (id: number) => void;
}

const QueueView: React.FC<QueueViewProps> = ({ 
    queue, 
    currentTrack, 
    onTrackSelect, 
    onBackToPlayer,
    onRemoveTrack
}) => {
    // Референс для автоматической прокрутки до активного трека
    const activeItemRef = useRef<HTMLDivElement>(null);
    
    // Прокручиваем к активному треку при монтировании
    useEffect(() => {
        if (activeItemRef.current) {
            // Небольшая задержка для надежности
            setTimeout(() => {
                activeItemRef.current?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }, 300);
        }
    }, []);

    return (
        <div className={styles.queueView}>
            <h2 className={styles.queueTitle}>
                Очередь воспроизведения
                <span className={styles.queueCount}>{queue.length} треков</span>
            </h2>
            
            {queue.length === 0 ? (
                <div className={styles.queueNoTracks}>
                    Очередь воспроизведения пуста
                </div>
            ) : (
                <div className={styles.queueList}>
                    {queue.map((track, index) => {
                        const isActive = currentTrack && track.id === currentTrack.id;
                        
                        return (
                            <div 
                                key={track.id}
                                className={`${styles.queueItem} ${isActive ? styles.queueItemActive : ''}`}
                                onClick={() => onTrackSelect(index)}
                                ref={isActive ? activeItemRef : null}
                            >
                                <div className={styles.queueItemMain}>
                                    <img 
                                        src={track.coverUrl || DEFAULT_COVER_URL} 
                                        alt={track.title} 
                                        className={styles.queueItemCover}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = DEFAULT_COVER_URL;
                                        }}
                                    />
                                    <div className={styles.queueItemInfo}>
                                        <div className={styles.queueItemTitle}>
                                            {track.title}
                                            {isActive && (
                                                <span className={styles.queueNowPlaying}>
                                                    <IconPlayingNow />
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.queueItemArtist}>{track.artist}</div>
                                    </div>
                                </div>

                                <div className={styles.queueItemControls}>
                                    <button 
                                        className={styles.queueItemRemove}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRemoveTrack(track.id);
                                        }}
                                        title="Удалить из очереди"
                                    >
                                        <span>×</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className={styles.backToPlayerButton}>
                <button onClick={onBackToPlayer}>
                    <IconBackToPlayer />
                    <span>Вернуться к плееру</span>
                </button>
            </div>
        </div>
    );
};

// Компонент для предварительной загрузки изображений
const ImagePreloader: React.FC<{ src: string; onLoad?: () => void }> = ({ src, onLoad }) => {
  useEffect(() => {
    if (!src) return;
    
    const img = new Image();
    img.src = src;
    img.onload = () => {
      if (onLoad) onLoad();
    };
    
    return () => {
      img.onload = null;
    };
  }, [src, onLoad]);
  
  return null;
};

const PlayerWindow: React.FC = () => {
    const { 
        playTrack, 
        isPlaying, 
        setIsPlaying, 
        audio,
        tracks,
        currentTrack,
        currentTrackIndex,
        getTrackCover,
        togglePlay,
        nextTrack,
        prevTrack,
        setVolume,
        pauseTrack,
        seekTo,
        isMasterPlayer,
        becomeMasterPlayer,
        repeatMode,
        toggleRepeat,
        shuffleMode,
        toggleShuffle,
        setCurrentTrackIndex,
        removeTrackFromQueue,
        setRepeatMode,
        shuffledQueue
    } = usePlayer();
    
    // Используем новый контекст отдельного окна плеера
    const { 
        optimizeOperation, 
        setLastSeekTime, 
        isControlActive 
    } = usePlayerWindow();
    
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [coverError, setCoverError] = useState(false);
    const [volume, setVolumeState] = useState(audio ? audio.volume : 1);
    const [coverUrl, setCoverUrl] = useState(DEFAULT_COVER_URL);
    const becameMasterRef = useRef(false);
    const [showQueue, setShowQueue] = useState(false);
    const [coverErrors, setCoverErrors] = useState<Record<number, boolean>>({});
    const [prevTrackCover, setPrevTrackCover] = useState<string | null>(null);
    const [nextTrackCover, setNextTrackCover] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [preloadedImages, setPreloadedImages] = useState<Record<string, boolean>>({});
    // Кеш для информации о соседних треках
    const [neighborTracks, setNeighborTracks] = useState<{
        prev: number | null;
        next: number | null;
    }>({ prev: null, next: null });
    // Добавляем состояние для хранения информации о соседних треках
    const [neighborTrackInfo, setNeighborTrackInfo] = useState<{
        prev: { title: string; artist: string } | null;
        next: { title: string; artist: string } | null;
    }>({ prev: null, next: null });
    const [isAnimatingNext, setIsAnimatingNext] = useState(false);
    const [isAnimatingPrev, setIsAnimatingPrev] = useState(false);
    const [pulsePlayButton, setPulsePlayButton] = useState(false);
    const [pulseShuffleButton, setPulseShuffleButton] = useState(false);
    const [pulseRepeatButton, setPulseRepeatButton] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Устанавливаем флаг открытия окна плеера при загрузке компонента
    useEffect(() => {
        // Устанавливаем метку времени открытия окна
        localStorage.setItem('player_window_opened', Date.now().toString());
        
        // При размонтировании компонента, убедимся, что флаг закрытия установлен
        return () => {
            const closedTime = Date.now();
            localStorage.setItem('player_window_closed', closedTime.toString());
            
            // Для гарантии того, что флаг закрытия будет установлен после флага открытия
            const openedTime = localStorage.getItem('player_window_opened');
            if (openedTime && parseInt(openedTime) >= closedTime) {
                localStorage.setItem('player_window_closed', (parseInt(openedTime) + 1).toString());
            }
        };
    }, []);

    // Добавляем обработчик закрытия окна без остановки воспроизведения
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Устанавливаем метку времени закрытия окна, которая должна быть новее метки открытия
            const closedTime = Date.now();
            localStorage.setItem('player_window_closed', closedTime.toString());
            
            // Плеер должен продолжать воспроизведение после закрытия окна
            localStorage.setItem('player_window_closed_keep_playing', 'true');
            
            // Для гарантии того, что флаг закрытия будет установлен после флага открытия
            const openedTime = localStorage.getItem('player_window_opened');
            if (openedTime && parseInt(openedTime) >= closedTime) {
                // Если метка открытия новее или равна метке закрытия, 
                // обновляем метку закрытия, делая её на 1 мс новее
                localStorage.setItem('player_window_closed', (parseInt(openedTime) + 1).toString());
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Пытаемся стать главным плеером при загрузке компонента
    useEffect(() => {
        // При первом рендере пытаемся стать мастер-плеером, но только один раз
        if (!isMasterPlayer && !becameMasterRef.current) {
            const result = becomeMasterPlayer();
            becameMasterRef.current = true;
            console.log('Окно плеера стало мастером:', result);
        }
    }, [isMasterPlayer, becomeMasterPlayer]);

    // Восстанавливаем состояние из localStorage при загрузке
    useEffect(() => {
        try {
            // Проверяем, есть ли сохраненное состояние
            const savedTrackJSON = localStorage.getItem('player_current_track');
            const savedPosition = localStorage.getItem('player_current_position');
            const savedVolume = localStorage.getItem('player_current_volume');
            const savedIsPlaying = localStorage.getItem('player_is_playing');
            
            if (savedTrackJSON) {
                console.log('Найдены сохраненные данные для восстановления состояния плеера');
                
                // Восстанавливаем трек
                const savedTrack = JSON.parse(savedTrackJSON) as Track;
                
                // Проверяем, есть ли трек уже в списке
                const trackIndex = tracks.findIndex(t => t.id === savedTrack.id);
                
                if (trackIndex !== -1) {
                    // Трек уже есть в списке, просто выбираем его
                    console.log('Трек уже в списке, индекс:', trackIndex);
                    setCurrentTrackIndex(trackIndex);
                } else {
                    // Добавляем трек в список
                    console.log('Добавляем трек в список');
                    playTrack(savedTrack);
                }
                
                // Восстанавливаем позицию воспроизведения
                if (savedPosition && audio) {
                    const position = parseFloat(savedPosition);
                    console.log('Восстанавливаем позицию:', position);
                    audio.currentTime = position;
                    seekTo(position);
                }
                
                // Восстанавливаем громкость
                if (savedVolume && audio) {
                    const vol = parseFloat(savedVolume);
                    console.log('Восстанавливаем громкость:', vol);
                    setVolumeState(vol);
                    setVolume(vol);
                    audio.volume = vol;
                }
                
                // Восстанавливаем состояние воспроизведения
                if (savedIsPlaying === 'true') {
                    console.log('Восстанавливаем воспроизведение');
                    setIsPlaying(true);
                    // Небольшая задержка для гарантии готовности аудио
                    setTimeout(() => {
                        if (audio) {
                            audio.muted = false;
                            audio.play().catch(err => {
                                console.error('Ошибка при восстановлении воспроизведения:', err);
                            });
                        }
                    }, 300);
                }
                
                // Очищаем localStorage после восстановления
                localStorage.removeItem('player_current_track');
                localStorage.removeItem('player_current_position');
                localStorage.removeItem('player_current_volume');
                localStorage.removeItem('player_is_playing');
            }
        } catch (error) {
            console.error('Ошибка при восстановлении состояния плеера:', error);
        }
    }, [audio, playTrack, seekTo, setVolume, tracks, setCurrentTrackIndex, setIsPlaying]);

    // Загружаем начальный объем
    useEffect(() => {
        if (audio) {
            setVolumeState(audio.volume);
        }
    }, [audio]);

    // Обновляем прогресс воспроизведения
    useEffect(() => {
        if (!audio) return;

        const updateProgress = () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration || 0);
            setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', updateProgress);
        
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', updateProgress);
        };
    }, [audio]);

    // Предзагрузка обложки для проверки и обновление URL
    useEffect(() => {
        if (!currentTrack) {
            setCoverUrl(DEFAULT_COVER_URL);
            return;
        }
        
        // Сначала устанавливаем обложку из контекста, чтобы не было задержки отображения
        const coverSource = getTrackCover(currentTrack.coverUrl);
        setCoverUrl(coverSource);
        
        // Затем проверяем, что обложка загрузится успешно
        const preloadImage = new Image();
        preloadImage.onload = () => {
            setCoverError(false);
        };
        
        preloadImage.onerror = () => {
            setCoverError(true);
            setCoverUrl(DEFAULT_COVER_URL);
        };
        
        preloadImage.src = coverSource;
    }, [currentTrack, getTrackCover]);

    // При возникновении ошибки загрузки обложки
    useEffect(() => {
        if (coverError && currentTrack) {
            setCoverUrl(DEFAULT_COVER_URL);
        }
    }, [coverError, currentTrack]);

    // Активно синхронизируем состояние с главным окном при запуске
    useEffect(() => {
        if (!isMasterPlayer) {
            // При открытии отдельного окна плеера отмечаем, что мы стали основным игроком
            const markAsMainPlayer = () => {
                // Попытка стать мастер-плеером
                if (!becameMasterRef.current) {
                    becomeMasterPlayer();
                    becameMasterRef.current = true;
                }
            };
            
            // Запускаем функцию с небольшой задержкой
            const timerId = setTimeout(markAsMainPlayer, 500);
            
            return () => {
                clearTimeout(timerId);
            };
        }
    }, [isMasterPlayer, becomeMasterPlayer]);

    // Проверка и получение актуального состояния при загрузке
    useEffect(() => {
        // Если нет текущего трека, пытаемся его получить
        if (!currentTrack && tracks.length > 0) {
            // Находим текущий или первый трек
            const storedPlayer = localStorage.getItem(ACTIVE_PLAYER_STORAGE_KEY);
            let selectedIndex = 0; // По умолчанию первый трек
            
            try {
                if (storedPlayer) {
                    // Проверяем, есть ли информация о текущем треке в localStorage
                    const playerState = JSON.parse(storedPlayer);
                    if (playerState && playerState.currentTrackIndex !== undefined) {
                        selectedIndex = playerState.currentTrackIndex;
                    }
                }
            } catch (e) {
                // Игнорируем ошибки парсинга
            }
            
            // Устанавливаем текущий трек
            if (selectedIndex >= 0 && selectedIndex < tracks.length) {
                playTrack(tracks[selectedIndex]);
            } else {
                playTrack(tracks[0]);
            }
        }
    }, [currentTrack, tracks, playTrack]);

    // Обновляем эффект для предзагрузки и кеширования обложек соседних треков
    useEffect(() => {
        if (!currentTrack || tracks.length <= 1) return;
        
        // Функция для получения индекса соседнего трека с учетом режима перемешивания
        const getNeighborIndex = (offset: number): number => {
            if (shuffleMode && shuffledQueue.length > 0) {
                // Находим текущий индекс в перемешанной очереди
                const currentShuffleIndex = shuffledQueue.indexOf(currentTrackIndex);
                if (currentShuffleIndex === -1) return -1;
                
                // Получаем индекс соседнего трека в перемешанной очереди
                const targetShuffleIndex = (currentShuffleIndex + offset + shuffledQueue.length) % shuffledQueue.length;
                // Возвращаем индекс трека в оригинальной очереди
                return shuffledQueue[targetShuffleIndex];
            } else {
                // Обычный режим: просто вычисляем соседний индекс
                return (currentTrackIndex + offset + tracks.length) % tracks.length;
            }
        };
        
        // Получаем индексы соседних треков
        const prevIndex = getNeighborIndex(-1);
        const nextIndex = getNeighborIndex(1);
        
        // Обновляем информацию о соседних треках
        setNeighborTracks({ prev: prevIndex, next: nextIndex });
        
        // Загружаем обложки и информацию о соседних треках
        if (prevIndex !== -1 && tracks[prevIndex]) {
            const prevTrack = tracks[prevIndex];
            setPrevTrackCover(prevTrack.coverUrl || DEFAULT_COVER_URL);
            setNeighborTrackInfo(prev => ({
                ...prev,
                prev: { title: prevTrack.title, artist: prevTrack.artist }
            }));
            
            // Предзагружаем изображение
            const img = new Image();
            img.src = prevTrack.coverUrl || DEFAULT_COVER_URL;
            img.onload = () => {
                setPreloadedImages(prev => ({ ...prev, [prevTrack.coverUrl || DEFAULT_COVER_URL]: true }));
            };
        } else {
            setPrevTrackCover(null);
            setNeighborTrackInfo(prev => ({ ...prev, prev: null }));
        }
        
        if (nextIndex !== -1 && tracks[nextIndex]) {
            const nextTrack = tracks[nextIndex];
            setNextTrackCover(nextTrack.coverUrl || DEFAULT_COVER_URL);
            setNeighborTrackInfo(prev => ({
                ...prev,
                next: { title: nextTrack.title, artist: nextTrack.artist }
            }));
            
            // Предзагружаем изображение
            const img = new Image();
            img.src = nextTrack.coverUrl || DEFAULT_COVER_URL;
            img.onload = () => {
                setPreloadedImages(prev => ({ ...prev, [nextTrack.coverUrl || DEFAULT_COVER_URL]: true }));
            };
        } else {
            setNextTrackCover(null);
            setNeighborTrackInfo(prev => ({ ...prev, next: null }));
        }
    }, [currentTrack, currentTrackIndex, tracks, shuffleMode, shuffledQueue]);

    // Форматирование времени
    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Обработчик изменения позиции воспроизведения
    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const seekPosition = Number(e.target.value);
        
        if (audio && audio.duration) {
            try {
                // Сохраняем текущее состояние
                const wasPlaying = !audio.paused;
                const seekTime = (seekPosition / 100) * audio.duration;
                
                // Обновляем UI для отзывчивости сразу
                setCurrentTime(seekTime);
                setProgress(seekPosition);
                
                // Мы ставим на паузу только во время перемотки, чтобы избежать шумов
                if (wasPlaying) {
                    audio.pause();
                }
                
                // Функция для завершения перемотки
                const completeSeek = () => {
                    if (!audio) return;
                    
                    // Устанавливаем позицию воспроизведения напрямую через DOM API
                    audio.currentTime = seekTime;
                    
                    // Если трек играл до перемотки, возобновляем воспроизведение
                    if (wasPlaying) {
                        const playPromise = audio.play();
                        if (playPromise !== undefined) {
                            playPromise.catch(error => {
                                // Тихая обработка ошибок воспроизведения
                                console.warn('Play after seek was prevented:', error);
                            });
                        }
                    }
                };
                
                // Функция для обработки события отпускания ползунка
                const handleMouseUp = () => {
                    // Всегда сначала становимся мастером для синхронизации
                    if (!isMasterPlayer) {
                        becomeMasterPlayer();
                    }
                    
                    // Немедленно применяем перемотку
                    completeSeek();
                    
                    // Удаляем обработчики
                    document.removeEventListener('mouseup', handleMouseUp);
                    document.removeEventListener('touchend', handleMouseUp);
                };
                
                // Добавляем обработчики для отслеживания окончания перемотки
                document.addEventListener('mouseup', handleMouseUp, { once: true });
                document.addEventListener('touchend', handleMouseUp, { once: true });
            } catch (error) {
                console.warn('Error during seek operation:', error);
            }
        }
    };

    // Модифицируем функции навигации для мгновенного обновления обложек и добавления анимаций
    const handleNextTrack = () => {
        // Всегда сначала становимся мастером, а затем выполняем действие
        if (!isMasterPlayer) {
            const success = becomeMasterPlayer();
            if (!success) return; // Если не удалось стать мастером, прекращаем выполнение
        }
        
        // Если трек играет, временно останавливаем для плавного перехода
        const wasPlaying = isPlaying;
        if (wasPlaying && audio) {
            audio.pause();
        }
        
        // Добавляем класс для анимации переходов
        const coverContainer = document.querySelector(`.${styles.coverContainer}`);
        if (coverContainer) {
            coverContainer.classList.add(styles.slideNext);
            
            // Удаляем класс после завершения анимации
            setTimeout(() => {
                coverContainer.classList.remove(styles.slideNext);
            }, 400);
        }
        
        // Подготавливаем следующий трек (предзагрузка обложки)
        if (neighborTracks.next !== null) {
            // Смещаем обложки: текущая -> предыдущая, следующая -> текущая
            const currCoverUrl = coverUrl !== DEFAULT_COVER_URL ? coverUrl : null;
            const nextCoverUrl = nextTrackCover;
            
            // Обновляем обложки асинхронно (перед фактическим переключением)
            if (nextCoverUrl) setCoverUrl(nextCoverUrl);
            if (currCoverUrl) setPrevTrackCover(currCoverUrl);
        }
        
        // Переходим к следующему треку
        nextTrack();
    };

    const handlePrevTrack = () => {
        // Всегда сначала становимся мастером, а затем выполняем действие
        if (!isMasterPlayer) {
            const success = becomeMasterPlayer();
            if (!success) return; // Если не удалось стать мастером, прекращаем выполнение
        }
        
        // Если трек играет, временно останавливаем для плавного перехода
        const wasPlaying = isPlaying;
        if (wasPlaying && audio) {
            audio.pause();
        }
        
        // Добавляем класс для анимации переходов
        const coverContainer = document.querySelector(`.${styles.coverContainer}`);
        if (coverContainer) {
            coverContainer.classList.add(styles.slidePrev);
            
            // Удаляем класс после завершения анимации
            setTimeout(() => {
                coverContainer.classList.remove(styles.slidePrev);
            }, 400);
        }
        
        // Подготавливаем предыдущий трек (предзагрузка обложки)
        if (neighborTracks.prev !== null) {
            // Смещаем обложки: текущая -> следующая, предыдущая -> текущая
            const currCoverUrl = coverUrl !== DEFAULT_COVER_URL ? coverUrl : null;
            const prevCoverUrl = prevTrackCover;
            
            // Обновляем обложки асинхронно (перед фактическим переключением)
            if (prevCoverUrl) setCoverUrl(prevCoverUrl);
            if (currCoverUrl) setNextTrackCover(currCoverUrl);
        }
        
        // Переходим к предыдущему треку
        prevTrack();
    };

    // Улучшенный обработчик для переключения воспроизведения с анимацией
    const handleTogglePlay = () => {
        // Всегда сначала становимся мастером
        if (!isMasterPlayer) {
            const success = becomeMasterPlayer();
            if (!success) return;
        }
        
        // Проверяем, что аудио элемент существует
        if (!audio) {
            togglePlay(); // Резервный вариант
            return;
        }
        
        // Добавим анимацию кнопки при клике
        const playButton = document.querySelector(`.${styles.playButton}`);
        if (playButton) {
            playButton.classList.add(styles.buttonPulse);
            setTimeout(() => {
                playButton.classList.remove(styles.buttonPulse);
            }, 300);
        }
        
        try {
            if (isPlaying) {
                // ПАУЗА: останавливаем воспроизведение напрямую через DOM API
                audio.pause();
                setIsPlaying(false);
                
                // Сохраняем позицию в localStorage с уникальным ключом для текущего трека
                const positionKey = `player_position_${currentTrack?.id}`;
                localStorage.setItem(positionKey, audio.currentTime.toString());
                
                // Создаем метку времени для синхронизации с другими вкладками
                const syncData = {
                    action: 'pause',
                    timestamp: Date.now(),
                    trackId: currentTrack?.id,
                    position: audio.currentTime,
                    source: 'player_window'
                };
                localStorage.setItem('audio_state_change', JSON.stringify(syncData));
            } else {
                // ВОСПРОИЗВЕДЕНИЕ: запускаем с текущей позиции
                const playPromise = audio.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            setIsPlaying(true);
                            
                            // Создаем метку времени для синхронизации с другими вкладками
                            const syncData = {
                                action: 'play',
                                timestamp: Date.now(),
                                trackId: currentTrack?.id,
                                position: audio.currentTime,
                                source: 'player_window'
                            };
                            localStorage.setItem('audio_state_change', JSON.stringify(syncData));
                        })
                        .catch(() => {
                            // Тихая обработка ошибок воспроизведения
                        });
                }
            }
        } catch (error) {
            console.warn('Direct audio control failed:', error);
            // В случае ошибки используем метод контекста как запасной вариант
            togglePlay();
        }
    };

    // Обработчики кнопок управления плеером с использованием оптимизированной обработки
    const handleToggleRepeat = () => {
        // Анимация кнопки
        const repeatButton = document.querySelector(`.${styles.repeatButton}`);
        if (repeatButton) {
            repeatButton.classList.add(styles.buttonRotate);
            setTimeout(() => {
                repeatButton.classList.remove(styles.buttonRotate);
            }, 400);
        }
        
        // Вызываем переключение режима
        toggleRepeat();
    };

    // Улучшенный обработчик для переключения режима перемешивания
    const handleToggleShuffle = () => {
        // Всегда сначала становимся мастером плеера
        if (!isMasterPlayer) {
            const success = becomeMasterPlayer();
            if (!success) return;
        }
        
        // Анимация кнопки
        const shuffleButton = document.querySelector(`.${styles.controlButton}[title*="Перемешивание"]`);
        if (shuffleButton) {
            shuffleButton.classList.add(styles.buttonRotate);
            setTimeout(() => {
                shuffleButton.classList.remove(styles.buttonRotate);
            }, 400);
        }
        
        // Вызываем переключение режима перемешивания
        toggleShuffle();
        
        // Дополнительная обработка и обратная связь
        console.log(`[PlayerWindow] Режим перемешивания ${!shuffleMode ? 'включен' : 'выключен'}`);
    };

    // Обработчик изменения громкости через прямой доступ
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolumeState(newVolume);
        
        // Всегда сначала становимся мастером, а затем выполняем действие
        if (!isMasterPlayer) {
            const success = becomeMasterPlayer();
            if (!success) return; // Если не удалось стать мастером, прекращаем выполнение
        }
        
        // Устанавливаем громкость напрямую
        if (audio) {
            audio.volume = newVolume;
        }
        
        // Также вызываем функцию из контекста для синхронизации
        setVolume(newVolume);
    };

    // Обработчик ошибки загрузки обложки для треков в очереди
    const handleQueueCoverError = (trackId: number) => {
        setCoverErrors(prev => ({ ...prev, [trackId]: true }));
    };

    // Функция для воспроизведения трека из очереди по индексу
    const handlePlayTrackFromQueue = (index: number) => {
        if (index >= 0 && index < tracks.length) {
            setCurrentTrackIndex(index);
            playTrack(tracks[index]);
        }
    };

    // Функция для удаления трека из очереди
    const handleRemoveFromQueue = (trackId: number) => {
        removeTrackFromQueue(trackId);
    };

    // Улучшенное переключение отображения очереди с анимацией
    const toggleQueueView = () => {
        if (isTransitioning) return; // Предотвращаем двойные переключения во время анимации
        
        setIsTransitioning(true);
        
        // Получаем контейнер для анимации
        const contentContainer = document.querySelector(`.${styles.playerContent}`);
        
        if (!showQueue) {
            // Переход к очереди
            if (contentContainer) {
                contentContainer.classList.add(styles.viewTransitionOut);
                
                setTimeout(() => {
                    setShowQueue(true);
                    contentContainer.classList.remove(styles.viewTransitionOut);
                    contentContainer.classList.add(styles.viewTransitionIn);
                    
                    setTimeout(() => {
                        contentContainer.classList.remove(styles.viewTransitionIn);
                        setIsTransitioning(false);
                    }, 400);
                }, 300); // Задержка для анимации исчезновения
            } else {
                setShowQueue(true);
                setTimeout(() => setIsTransitioning(false), 400);
            }
        } else {
            // Переход к плееру
            if (contentContainer) {
                contentContainer.classList.add(styles.viewTransitionOut);
                
                setTimeout(() => {
                    setShowQueue(false);
                    contentContainer.classList.remove(styles.viewTransitionOut);
                    contentContainer.classList.add(styles.viewTransitionIn);
                    
                    setTimeout(() => {
                        contentContainer.classList.remove(styles.viewTransitionIn);
                        setIsTransitioning(false);
                    }, 400);
                }, 300); // Задержка для анимации исчезновения
            } else {
                setShowQueue(false);
                setTimeout(() => setIsTransitioning(false), 400);
            }
        }
    };

    // Обработчик событий аудио для избежания перезагрузки
    useEffect(() => {
        if (!audio) return;
        
        // Функция для оптимизации загрузки аудио
        const handleAudioEvents = () => {
            // Предотвращаем перезагрузку трека при паузе/воспроизведении
            if (audio.networkState === 2) { // NETWORK_LOADING
                // Если трек уже загружается, не выполняем лишних действий
                return;
            }
        };
        
        // Добавляем слушатели событий
        audio.addEventListener('pause', handleAudioEvents);
        audio.addEventListener('play', handleAudioEvents);
        audio.addEventListener('seeking', handleAudioEvents);
        audio.addEventListener('seeked', handleAudioEvents);
        
        return () => {
            // Удаляем слушатели при размонтировании
            audio.removeEventListener('pause', handleAudioEvents);
            audio.removeEventListener('play', handleAudioEvents);
            audio.removeEventListener('seeking', handleAudioEvents);
            audio.removeEventListener('seeked', handleAudioEvents);
        };
    }, [audio]);

    // Обновляем обработчик событий хранилища
    useEffect(() => {
        if (!audio || !currentTrack) return;
        
        const handleStorageChange = (event: StorageEvent) => {
            if (event.key !== 'audio_state_change' || !event.newValue) return;
            
            try {
                const data = JSON.parse(event.newValue);
                
                // Игнорируем собственные события
                if (data.source === 'player_window') return;
                
                // Проверяем, что событие относится к текущему треку
                if (data.trackId !== currentTrack.id) return;
                
                if (data.action === 'pause') {
                    // Остановка воспроизведения из другой вкладки
                    audio.pause();
                    setIsPlaying(false);
                    
                    // Сохраняем позицию в localStorage с уникальным ключом
                    const positionKey = `player_position_${currentTrack.id}`;
                    localStorage.setItem(positionKey, data.position.toString());
                } else if (data.action === 'play') {
                    // Начало воспроизведения из другой вкладки
                    const playPromise = audio.play();
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                setIsPlaying(true);
                            })
                            .catch(() => {
                                // Тихая обработка ошибок
                            });
                    }
                }
            } catch (error) {
                console.warn('Error processing storage event:', error);
            }
        };
        
        // Добавляем слушатель событий хранилища
        window.addEventListener('storage', handleStorageChange);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [audio, currentTrack, setIsPlaying]);

    // Добавляем эффект для восстановления позиции при загрузке трека
    useEffect(() => {
        if (!audio || !currentTrack) return;
        
        const positionKey = `player_position_${currentTrack.id}`;
        const savedPosition = localStorage.getItem(positionKey);
        
        if (savedPosition) {
            const position = parseFloat(savedPosition);
            // Проверяем, что позиция валидная
            if (!isNaN(position) && position >= 0 && position <= audio.duration) {
                // Устанавливаем позицию только если трек не играет
                if (!isPlaying) {
                    audio.currentTime = position;
                }
            }
        }
    }, [audio, currentTrack, isPlaying]);

    // Обработчики для кликов по соседним обложкам
    const handlePrevCoverClick = () => {
        if (neighborTracks.prev !== null) {
            // При клике на обложку предыдущего трека, перемещаем пользователя 
            // сразу к предыдущему треку, игнорируя правило 3 секунд
            // Для этого сначала перематываем текущий трек до момента менее 3 секунд
            if (audio && audio.currentTime >= 3) {
                audio.currentTime = 0;
            }
            // Затем вызываем стандартный обработчик для перехода к предыдущему треку
            handlePrevTrack();
        }
    };
    
    const handleNextCoverClick = () => {
        if (neighborTracks.next !== null) {
            handleNextTrack();
        }
    };

    // Отображаем загрузку, если нет трека
    if (!currentTrack) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingText}>Загрузка плеера...</div>
            </div>
        );
    }

    return (
        <div className={styles.playerWindow}>
            {/* Фоновый слой с размытой обложкой */}
            {currentTrack && (
                <div
                    className={styles.playerBackground}
                    style={{
                        backgroundImage: `url(${currentTrack.coverUrl || DEFAULT_COVER_URL})`,
                    }}
                />
            )}

            {/* Заголовок окна */}
            <div className={styles.windowHeader}>
                <h1 
                    className={`${styles.windowTitle} ${isTransitioning ? styles.titleTransition : ''}`}
                    key={showQueue ? 'queue-title' : 'player-title'}
                >
                    {showQueue ? "Очередь воспроизведения" : "Музыкальный плеер"}
                    {isMasterPlayer && !showQueue && (
                        <span className={styles.masterBadge}> (Основной)</span>
                    )}
                </h1>
                {!showQueue && (
                    <button
                        className={styles.queueButton}
                        onClick={toggleQueueView}
                        title="Показать очередь воспроизведения"
                    >
                        <IconQueue />
                        <span>Очередь ({tracks.length})</span>
                    </button>
                )}
            </div>

            {/* Основной контент плеера */}
            <div className={styles.playerContent}>
                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingText}>
                            Загрузка плеера...
                        </div>
                    </div>
                ) : showQueue ? (
                    // Вид очереди воспроизведения с анимацией
                    <QueueView
                        queue={tracks}
                        currentTrack={currentTrack}
                        onTrackSelect={handlePlayTrackFromQueue}
                        onBackToPlayer={toggleQueueView}
                        onRemoveTrack={handleRemoveFromQueue}
                    />
                ) : (
                    // Вид плеера
                    <>
                        {currentTrack ? (
                            <>
                                {/* Карусель обложек */}
                                <div className={styles.coverCarousel}>
                                    <div 
                                        className={`${styles.sideTrackCover} ${styles.prevTrackCover} ${prevTrackCover ? styles.hasImage : styles.noImage}`}
                                        onClick={handlePrevCoverClick}
                                        title="Предыдущий трек"
                                    >
                                        {prevTrackCover && (
                                            <>
                                                <img
                                                    src={prevTrackCover}
                                                    alt="Предыдущий трек"
                                                    className={`${styles.sideTrackImage} ${preloadedImages[prevTrackCover] ? styles.loaded : styles.loading}`}
                                                    onLoad={(e) => {
                                                        // Добавляем класс loaded после загрузки
                                                        (e.target as HTMLImageElement).classList.remove(styles.loading);
                                                        (e.target as HTMLImageElement).classList.add(styles.loaded);
                                                        setPreloadedImages(prev => ({ ...prev, [prevTrackCover]: true }));
                                                    }}
                                                />
                                                {neighborTrackInfo.prev && (
                                                    <div className={styles.sideTrackInfo}>
                                                        <div className={styles.sideTrackTitle}>{neighborTrackInfo.prev.title}</div>
                                                        <div className={styles.sideTrackArtist}>{neighborTrackInfo.prev.artist}</div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    
                                    <div className={`${styles.coverContainer} ${isAnimatingNext ? styles.slideNext : ''} ${isAnimatingPrev ? styles.slidePrev : ''}`}>
                                        <img
                                            src={
                                                currentTrack.coverUrl ||
                                                DEFAULT_COVER_URL
                                            }
                                            alt={`${currentTrack.title} обложка`}
                                            className={styles.coverImage}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src =
                                                    DEFAULT_COVER_URL;
                                            }}
                                        />
                                    </div>
                                    
                                    <div 
                                        className={`${styles.sideTrackCover} ${styles.nextTrackCover} ${nextTrackCover ? styles.hasImage : styles.noImage}`}
                                        onClick={handleNextCoverClick}
                                        title="Следующий трек"
                                    >
                                        {nextTrackCover && (
                                            <>
                                                <img
                                                    src={nextTrackCover}
                                                    alt="Следующий трек"
                                                    className={`${styles.sideTrackImage} ${preloadedImages[nextTrackCover] ? styles.loaded : styles.loading}`}
                                                    onLoad={(e) => {
                                                        // Добавляем класс loaded после загрузки
                                                        (e.target as HTMLImageElement).classList.remove(styles.loading);
                                                        (e.target as HTMLImageElement).classList.add(styles.loaded);
                                                        setPreloadedImages(prev => ({ ...prev, [nextTrackCover]: true }));
                                                    }}
                                                />
                                                {neighborTrackInfo.next && (
                                                    <div className={styles.sideTrackInfo}>
                                                        <div className={styles.sideTrackTitle}>{neighborTrackInfo.next.title}</div>
                                                        <div className={styles.sideTrackArtist}>{neighborTrackInfo.next.artist}</div>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Информация о треке */}
                                <div className={styles.trackInfo}>
                                    <h2 className={styles.trackTitle}>
                                        {currentTrack.title}
                                    </h2>
                                    <div className={styles.trackArtist}>
                                        {currentTrack.artist}
                                    </div>
                                </div>

                                {/* Элементы управления плеером */}
                                <div className={styles.customPlayerControls}>
                                    {/* Ползунок прогресса */}
                                    <div className={styles.progressControls}>
                                        <span className={styles.timeText}>
                                            {formatTime(currentTime)}
                                        </span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={progress}
                                            className={styles.progressSlider}
                                            onChange={handleSeek}
                                            style={{
                                                "--progress-width": `${progress}%`,
                                            } as React.CSSProperties}
                                        />
                                        <span className={styles.timeText}>
                                            {formatTime(duration)}
                                        </span>
                                    </div>

                                    {/* Кнопки управления */}
                                    <div className={styles.playerButtons}>
                                        <button
                                            className={`${styles.controlButton} ${
                                                shuffleMode
                                                    ? styles.activeMode
                                                    : styles.modeButton
                                            }`}
                                            onClick={handleToggleShuffle}
                                            title={shuffleMode ? "Перемешивание включено" : "Перемешивание выключено"}
                                        >
                                            <IconShuffle />
                                        </button>
                                        <button
                                            className={styles.controlButton}
                                            onClick={handlePrevTrack}
                                            title="Предыдущий трек"
                                        >
                                            <IconSkipPrevious />
                                        </button>
                                        <button
                                            className={`${styles.controlButton} ${styles.playButton}`}
                                            onClick={handleTogglePlay}
                                            title={
                                                isPlaying
                                                    ? "Пауза"
                                                    : "Воспроизвести"
                                            }
                                        >
                                            {isPlaying ? (
                                                <IconPause />
                                            ) : (
                                                <IconPlay />
                                            )}
                                        </button>
                                        <button
                                            className={styles.controlButton}
                                            onClick={handleNextTrack}
                                            title="Следующий трек"
                                        >
                                            <IconSkipNext />
                                        </button>
                                        <button
                                            onClick={handleToggleRepeat}
                                            className={`${styles.controlButton} ${
                                                repeatMode !== 'none' ? styles.activeMode : styles.modeButton
                                            }`}
                                            title={
                                                repeatMode === 'none'
                                                    ? "Повтор выключен"
                                                    : repeatMode === 'all'
                                                    ? "Повтор всех треков"
                                                    : "Повтор текущего трека"
                                            }
                                        >
                                            {repeatMode === 'one' ? (
                                                <IconRepeatOne />
                                            ) : (
                                                <IconRepeat />
                                            )}
                                        </button>
                                    </div>

                                    {/* Регулятор громкости */}
                                    <div className={styles.volumeControl}>
                                        <span className={styles.volumeIcon}>
                                            {volume === 0 ? (
                                                <IconVolumeX />
                                            ) : volume < 0.5 ? (
                                                <IconVolumeLow />
                                            ) : (
                                                <IconVolumeHigh />
                                            )}
                                        </span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={1}
                                            step={0.01}
                                            value={volume}
                                            className={styles.volumeSlider}
                                            onChange={handleVolumeChange}
                                            style={{
                                                "--volume-width": `${
                                                    volume * 100
                                                }%`,
                                            } as React.CSSProperties}
                                        />
                                    </div>
                                </div>

                                {/* Визуализатор воспроизведения */}
                                {isPlaying && (
                                    <div className={styles.playingAnimation}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={styles.infoText}>
                                Нет выбранного трека
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default PlayerWindow; 