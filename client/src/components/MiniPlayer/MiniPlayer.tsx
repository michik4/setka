import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { useTestFeatures } from '../../contexts/TestFeaturesContext';
import styles from './MiniPlayer.module.css';
import { Link } from 'react-router-dom';
import audioChannelService from '../../services/AudioChannelService';
import { useQueue } from '../../contexts/QueueContext';
import { Tooltip, CircularProgress } from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Person, ViewList, VolumeDown, VolumeOff, VolumeUp } from '@mui/icons-material';

// Константа для обложки по умолчанию
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

interface MiniPlayerProps {
    forceExpanded?: boolean;
}

const MiniPlayer: React.FC<MiniPlayerProps> = ({ forceExpanded = false }) => {
    const { 
        currentTrack, 
        isPlaying, 
        togglePlay, 
        nextTrack, 
        prevTrack,
        audio,
        getTrackCover,
        isPlayerWindowOpen,
        tracks,
        setCurrentTrackIndex,
        repeatMode,
        toggleRepeat,
        shuffleMode,
        toggleShuffle,
        setIsPlaying,
        channelId,
        playTrackByIndex
    } = usePlayer();
    
    const { fetchUserTracks, clearQueue } = useQueue();
    
    const { isPlayerWindowEnabled } = useTestFeatures();
    
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [coverError, setCoverError] = useState(false);
    const [coverUrl, setCoverUrl] = useState(DEFAULT_COVER_URL);
    const [volumeOpen, setVolumeOpen] = useState(false);
    const [volume, setVolume] = useState(() => audio?.volume || 1);
    const [queueOpen, setQueueOpen] = useState(false);
    const [coverErrors, setCoverErrors] = useState<Record<number, boolean>>({});
    const [expandedTrackInfo, setExpandedTrackInfo] = useState(false);
    const [shouldMarquee, setShouldMarquee] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isResettingQueue, setIsResettingQueue] = useState(false);
    const progressBarRef = useRef<HTMLDivElement>(null);
    const volumeSliderRef = useRef<HTMLDivElement>(null);
    const volumeHandleRef = useRef<HTMLDivElement>(null);
    const queuePanelRef = useRef<HTMLDivElement>(null);
    const trackTitleRef = useRef<HTMLDivElement>(null);
    const trackArtistRef = useRef<HTMLDivElement>(null);
    const newWindowRef = useRef<Window | null>(null);

    // Проверка переполнения при инициализации компонента
    useLayoutEffect(() => {
        if (currentTrack && (trackTitleRef.current || trackArtistRef.current)) {
            // Даем DOM время на отрисовку
            setTimeout(() => {
                const titleOverflow = trackTitleRef.current && 
                    (trackTitleRef.current.scrollWidth > trackTitleRef.current.clientWidth);
                const artistOverflow = trackArtistRef.current && 
                    (trackArtistRef.current.scrollWidth > trackArtistRef.current.clientWidth);
                
                if (titleOverflow || artistOverflow || forceExpanded) {
                    setExpandedTrackInfo(true);
                }
            }, 10);
        }
    }, [currentTrack, forceExpanded]);

    // Проверяем переполнение текста при взаимодействии
    useEffect(() => {
        const checkTextOverflow = () => {
            if (trackTitleRef.current || trackArtistRef.current) {
                const titleOverflow = trackTitleRef.current && 
                    (trackTitleRef.current.scrollWidth > trackTitleRef.current.clientWidth);
                const artistOverflow = trackArtistRef.current && 
                    (trackArtistRef.current.scrollWidth > trackArtistRef.current.clientWidth);
                
                // Если текст переполняется или включен режим forceExpanded, показываем его полностью или запускаем прокрутку
                if (titleOverflow || artistOverflow || forceExpanded) {
                    // В зависимости от hovering состояния и forceExpanded выбираем между marquee и обычным расширением
                    if (isHovered && !forceExpanded) {
                        setShouldMarquee(true);
                        setExpandedTrackInfo(false);
                    } else {
                        setShouldMarquee(false);
                        setExpandedTrackInfo(true);
                    }
                } else {
                    setShouldMarquee(false);
                    setExpandedTrackInfo(false);
                }
            }
        };

        checkTextOverflow();
        window.addEventListener('resize', checkTextOverflow);

        return () => {
            window.removeEventListener('resize', checkTextOverflow);
        };
    }, [currentTrack, isHovered, forceExpanded]);

    // Обновление прогресса воспроизведения
    useEffect(() => {
        const updateProgress = () => {
            if (audio && audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
                setCurrentTime(audio.currentTime);
                setDuration(audio.duration);
            }
        };

        audio.addEventListener('timeupdate', updateProgress);
        
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
        };
    }, [audio]);

    // Инициализация громкости
    useEffect(() => {
        if (audio) {
            setVolume(audio.volume);
        }
    }, [audio]);

    // Обработчик клика вне панели громкости и очереди
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Закрываем панель громкости при клике вне её
            if (volumeOpen && 
                event.target instanceof Element && 
                !event.target.closest(`.${styles.volumeControl}`)) {
                setVolumeOpen(false);
            }
            
            // Закрываем панель очереди при клике вне её
            if (queueOpen && 
                queuePanelRef.current && 
                !queuePanelRef.current.contains(event.target as Node) &&
                event.target instanceof Element && 
                !event.target.closest(`.${styles.extraButton}`)) {
                setQueueOpen(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [volumeOpen, queueOpen]);

    // Сбрасываем состояние ошибки обложки при смене трека
    useEffect(() => {
        setCoverError(false);
    }, [currentTrack?.id]);

    // Получаем URL обложки для основного отображения в плеере
    useEffect(() => {
        if (!currentTrack) return;
        
        // Если уже установлена обложка по умолчанию из-за ошибки, не перезагружаем
        if (coverError) {
            setCoverUrl(DEFAULT_COVER_URL);
            return;
        }
        
        const source = getTrackCover(currentTrack.coverUrl);
        
        // Проверяем, изменилась ли обложка, чтобы избежать ненужной перезагрузки
        if (source !== coverUrl) {
            setCoverUrl(source);
        }
    }, [currentTrack, getTrackCover, coverError, coverUrl]);

    // Регистрируем аудио в сервисе при монтировании
    useEffect(() => {
        if (!channelId) {
            console.error('[MiniPlayer] channelId не определен');
            return;
        }
        
        console.log(`[MiniPlayer] Использование канала из PlayerContext: ${channelId}`);
        
        // Проверяем, зарегистрирован ли уже канал
        if (!audioChannelService.isChannelRegistered(channelId)) {
            console.log(`[MiniPlayer] Регистрация аудио канала: ${channelId}`);
            audioChannelService.registerAudio(channelId, audio);
        } else {
            console.log(`[MiniPlayer] Канал ${channelId} уже зарегистрирован`);
        }
        
        // При размонтировании не удаляем регистрацию, так как канал используется PlayerContext
    }, [audio, channelId]);
    
    // Обработчик для управления воспроизведением через сервис
    const handlePlayPause = useCallback(() => {
        togglePlay();
    }, [togglePlay]);

    // Модифицируем метод для работы с аудио сервисом через useEffect
    useEffect(() => {
        // Проверяем, зарегистрирован ли канал
        if (channelId && !audioChannelService.isChannelRegistered(channelId)) {
            console.log(`[MiniPlayer] Регистрация аудио канала через useEffect: ${channelId}`);
            audioChannelService.registerAudio(channelId, audio);
        }
    }, [audio, channelId]);

    // Функция для открытия плеера в отдельном окне
    const openPlayerWindow = () => {
        // Устанавливаем метку открытия окна плеера
        localStorage.setItem('player_window_opened', Date.now().toString());
        
        // Открываем новое окно
        const windowRef = window.open('/player', 'Vseti Player', 'width=800,height=600,resizable=yes');
        if (windowRef) {
            newWindowRef.current = windowRef;
        }
    };
    
    // Функция для сброса очереди и загрузки треков из "Моя музыка"
    const resetQueueWithUserTracks = async () => {
        try {
            setIsResettingQueue(true);
            
            // Сначала очищаем очередь
            clearQueue();
            
            // Затем загружаем треки пользователя
            await fetchUserTracks();
            
            // После успешной загрузки запускаем воспроизведение первого трека
            setTimeout(() => {
                playTrackByIndex(0);
                setIsResettingQueue(false);
            }, 500);
            
        } catch (error) {
            console.error('[MiniPlayer] Ошибка при сбросе очереди:', error);
            setIsResettingQueue(false);
        }
    };

    // Если нет текущего трека, не отображаем плеер
    if (!currentTrack) {
        return null;
    }

    // Обработка ошибки загрузки обложки
    const handleCoverError = () => {
        setCoverError(true);
        setCoverUrl(DEFAULT_COVER_URL);
    };

    // Обработка ошибки загрузки обложки в очереди
    const handleQueueCoverError = (trackId: number) => {
        setCoverErrors(prev => ({ ...prev, [trackId]: true }));
    };

    // Переключение трека в очереди
    const handleTrackSelect = (index: number) => {
        playTrackByIndex(index);
        setQueueOpen(false);
    };

    // Форматирование времени
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Изменение позиции проигрывания
    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !audio) return;
        
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickPositionX = e.clientX - rect.left;
        const percentage = (clickPositionX / rect.width) * 100;
        
        // Устанавливаем новую позицию воспроизведения
        audio.currentTime = (percentage / 100) * audio.duration;
        setProgress(percentage);
    };

    // Переключение панели громкости
    const toggleVolumePanel = () => {
        setVolumeOpen(prev => !prev);
    };

    // Переключение панели очереди
    const toggleQueuePanel = () => {
        setQueueOpen(prev => !prev);
    };

    // Изменение громкости при клике на слайдер
    const handleVolumeChange = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!volumeSliderRef.current || !audio) return;
        
        const rect = volumeSliderRef.current.getBoundingClientRect();
        const clickPositionX = e.clientX - rect.left;
        let newVolume = clickPositionX / rect.width;
        
        // Ограничиваем значение от 0 до 1
        newVolume = Math.max(0, Math.min(1, newVolume));
        
        // Устанавливаем новую громкость
        audio.volume = newVolume;
        setVolume(newVolume);
    };

    // Изменение громкости при перетаскивании
    const handleVolumeDrag = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        handleVolumeChange(e);
        
        const onMouseMove = (moveEvent: MouseEvent) => {
            if (!volumeSliderRef.current || !audio) return;
            
            const rect = volumeSliderRef.current.getBoundingClientRect();
            const movePositionX = moveEvent.clientX - rect.left;
            let newVolume = movePositionX / rect.width;
            
            // Ограничиваем значение от 0 до 1
            newVolume = Math.max(0, Math.min(1, newVolume));
            
            // Устанавливаем новую громкость
            audio.volume = newVolume;
            setVolume(newVolume);
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Классы для заголовка и исполнителя трека с учётом переполнения
    const trackTitleClasses = `${styles.trackTitle} ${expandedTrackInfo ? styles.expanded : ''} ${shouldMarquee ? styles.marquee : ''}`;
    const trackArtistClasses = `${styles.trackArtist} ${expandedTrackInfo ? styles.expanded : ''} ${shouldMarquee ? styles.marquee : ''}`;

    const extraButtonFontSize = 18;

    return (
        <div 
            className={styles.miniPlayer}
            onMouseEnter={() => setIsHovered(true)} 
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className={styles.playerMain}>
                <div className={styles.trackInfo}>
                    <img 
                        src={coverUrl} 
                        alt={currentTrack.title} 
                        className={styles.coverImage} 
                        onError={handleCoverError}
                    />
                    <div className={styles.trackDetails}>
                        <div 
                            className={trackTitleClasses} 
                            title={currentTrack.title}
                            ref={trackTitleRef}
                            onClick={() => setExpandedTrackInfo(!expandedTrackInfo)}
                        >
                            {shouldMarquee ? (
                                <span className={styles.content}>{currentTrack.title}</span>
                            ) : (
                                currentTrack.title
                            )}
                        </div>
                        <div 
                            className={trackArtistClasses} 
                            title={currentTrack.artist}
                            ref={trackArtistRef}
                        >
                            {shouldMarquee ? (
                                <span className={styles.content}>{currentTrack.artist}</span>
                            ) : (
                                currentTrack.artist
                            )}
                        </div>
                        <div className={styles.timeDisplay}>
                            {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                    </div>
                </div>
                
                <div className={styles.controls}>
                    {/* Кнопка повтора */}
                    <button 
                        className={`${styles.controlButton} ${repeatMode !== 'none' ? styles.active : ''}`} 
                        onClick={toggleRepeat}
                        aria-label="Режим повтора"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            {repeatMode === 'one' ? (
                                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                            ) : (
                                <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                            )}
                        </svg>
                    </button>

                    <button 
                        className={styles.controlButton} 
                        onClick={prevTrack}
                        aria-label="Предыдущий трек"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                        </svg>
                    </button>
                    
                    <button 
                        className={`${styles.controlButton} ${styles.playButton}`} 
                        onClick={handlePlayPause}
                        aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
                    >
                        {isPlaying ? (
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                            </svg>
                        ) : (
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        )}
                    </button>
                    
                    <button 
                        className={styles.controlButton} 
                        onClick={nextTrack}
                        aria-label="Следующий трек"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                        </svg>
                    </button>

                    {/* Кнопка перемешивания */}
                    <button 
                        className={`${styles.controlButton} ${shuffleMode ? styles.active : ''}`} 
                        onClick={toggleShuffle}
                        aria-label="Перемешивание"
                    >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm0.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                        </svg>
                    </button>
                </div>
                
                <div className={styles.otherControls}>
                    {/* Регулировка громкости */}
                    <div className={`${styles.volumeControl} ${volumeOpen ? styles.volumeControlOpen : ''}`}>
                        <button 
                            className={styles.volumeButton} 
                            onClick={toggleVolumePanel}
                            aria-label="Громкость"
                        >
                           
                                {volume === 0 ? (
                                    <VolumeOff sx={{ fontSize: extraButtonFontSize }}/>
                                ) : volume < 0.5 ? (
                                    <VolumeDown sx={{ fontSize: extraButtonFontSize }}/>
                                ) : (
                                    <VolumeUp sx={{ fontSize: extraButtonFontSize }}/>
                                )}
                            
                        </button>
                        <div className={styles.volumePanel}>
                            <div 
                                className={styles.volumeSlider}
                                ref={volumeSliderRef}
                                onClick={handleVolumeChange}
                            >
                                <div 
                                    className={styles.volumeFilled} 
                                    style={{ width: `${volume * 100}%` }}
                                />
                                <div 
                                    className={styles.volumeHandle}
                                    ref={volumeHandleRef}
                                    onMouseDown={handleVolumeDrag}
                                    style={{ left: `${volume * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Кнопка очереди */}
                    <button 
                        className={`${styles.extraButton} ${queueOpen ? styles.active : ''}`} 
                        onClick={toggleQueuePanel}
                        aria-label="Очередь воспроизведения"
                    >
                        <ViewList sx={{ fontSize: extraButtonFontSize }}/>
                    </button>
                    
                    {/* Кнопка сброса очереди и загрузки треков из "Моя музыка" */}
                    <button 
                        className={`${styles.extraButton} ${isResettingQueue ? styles.loading : ''}`}
                        onClick={resetQueueWithUserTracks}
                        disabled={isResettingQueue}
                        aria-label="Загрузить треки из Моей музыки"
                    >
                        {isResettingQueue ? (
                            <CircularProgress size={20} className={styles.loadingIndicator} />
                        ) : (
                            <Person sx={{ fontSize: extraButtonFontSize }}/>
                        )}
                    </button>
                    
                    {/* Кнопка открытия плеера в отдельном окне (только если включены тестовые функции) */}
                    {isPlayerWindowEnabled && (
                        <button 
                            className={styles.extraButton} 
                            onClick={openPlayerWindow}
                            aria-label="Открыть в отдельном окне"
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M19 19H5V5h7V3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.6l-9.8 9.8 1.4 1.4L19 6.4V10h2V3h-7z"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            
            {/* Секция с прогрессбаром */}
            <div className={styles.progressSection}>
                <div 
                    className={styles.progressBar}
                    ref={progressBarRef}
                    onClick={handleProgressBarClick}
                >
                    <div 
                        className={styles.progressFilled} 
                        style={{ width: `${progress}%` }}
                    />
                    <div 
                        className={styles.progressHandle} 
                        style={{ left: `${progress}%` }}
                    />
                </div>
            </div>
            
            {/* Панель очереди воспроизведения */}
            <div 
                className={`${styles.queuePanel} ${queueOpen ? styles.queuePanelOpen : ''}`}
                ref={queuePanelRef}
            >
                <div className={styles.queueHeader}>
                    <div className={styles.queueTitle}>Очередь воспроизведения</div>
                    <div className={styles.queueCount}>{tracks.length} треков</div>
                </div>
                <div className={styles.queueList}>
                    {tracks.map((track, index) => {
                        const isCurrentTrack = currentTrack && track.id === currentTrack.id;
                        const trackCoverUrl = coverErrors[track.id] 
                            ? DEFAULT_COVER_URL
                            : getTrackCover(track.coverUrl);
                        
                        return (
                            <div 
                                key={`mini-queue-${track.id}-${index}`}
                                className={`${styles.queueItem} ${isCurrentTrack ? styles.queueItemActive : ''}`}
                                onClick={() => handleTrackSelect(index)}
                            >
                                <img 
                                    src={trackCoverUrl} 
                                    alt={track.title} 
                                    className={styles.queueItemImage}
                                    onError={() => handleQueueCoverError(track.id)}
                                />
                                <div className={styles.queueItemInfo}>
                                    <div className={styles.queueItemTitle}>{track.title}</div>
                                    <div className={styles.queueItemArtist}>{track.artist}</div>
                                </div>
                                {isCurrentTrack && isPlaying && (
                                    <div className={styles.playingIndicator}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default MiniPlayer; 