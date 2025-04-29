import React, { useState, useEffect, useRef, useCallback } from 'react';
import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { api } from '../../utils/api';
import { Track } from '../../types/music.types';
import AuOrder from './AuOrder';
import styles from './AuPlayer.module.css';
import { usePlayer } from '../../contexts/PlayerContext';
import { formatTime as formatTrackTime } from '../../utils/formatTime';
import audioChannelService from '../../services/AudioChannelService';
// import 'react-h5-audio-player/lib/styles.less' Use LESS
// import 'react-h5-audio-player/src/styles.scss' Use SASS

// Получаем URL API из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || '/api';
const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || '/api/media';

// Константа для обложки по умолчанию
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

// Функция для обновления длительности трека на сервере
const updateTrackDuration = async (trackId: number, duration: string) => {
    try {
        await api.put(`/music/duration/${trackId}`, { duration });
        console.log(`[Music] Длительность трека ${trackId} обновлена: ${duration}`);
    } catch (err) {
        console.error(`[Music] Ошибка при обновлении длительности трека ${trackId}:`, err);
    }
};

// Функция для получения длительности аудиофайла
const getAudioDuration = (url: string, trackId?: number): Promise<string> => {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.addEventListener('loadedmetadata', () => {
            const duration = formatTrackTime(audio.duration);
            resolve(duration);
            
            // Если указан ID трека, отправляем длительность на сервер
            if (trackId) {
                updateTrackDuration(trackId, duration);
            }
        });
        
        audio.addEventListener('error', () => {
            console.error(`[Music] Ошибка при загрузке аудиофайла: ${url}`);
            resolve('0:00');
        });
        
        audio.src = url;
    });
};

const AuPlayer = () => {
    const { 
        tracks: queueTracks, 
        setTracks: setQueueTracks,
        currentTrack, 
        currentTrackIndex, 
        isPlaying,
        setIsPlaying,
        nextTrack,
        prevTrack,
        playTrackByIndex,
        audio,
        repeatMode,
        shuffleMode,
        toggleRepeat,
        toggleShuffle,
        setVolume,
        getTrackCover,
        channelId
    } = usePlayer();
    const [isLoading, setIsLoading] = useState(false);
    const playerRef = useRef<any>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [volumeLevel, setVolumeLevel] = useState(100);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [coverError, setCoverError] = useState(false);
    const progressSliderRef = useRef<HTMLInputElement>(null);
    const volumeSliderRef = useRef<HTMLInputElement>(null);
    const volumeTimerRef = useRef<number | null>(null);
    const [expandedMode, setExpandedMode] = useState(false);
    const [popupMode, setPopupMode] = useState(false);
    const [showTracks, setShowTracks] = useState(false);
    const [newWindowRef, setNewWindowRef] = useState<Window | null>(null);

    // Обновляем CSS переменную для отображения прогресса воспроизведения
    useEffect(() => {
        if (progressSliderRef.current) {
            progressSliderRef.current.style.setProperty('--progress-width', `${progress}%`);
        }
    }, [progress]);

    // Обновляем CSS переменную для отображения уровня громкости
    useEffect(() => {
        if (volumeSliderRef.current) {
            volumeSliderRef.current.style.setProperty('--volume-width', `${volumeLevel}%`);
        }
    }, [volumeLevel, showVolumeSlider]);

    // Подписываемся на события общего аудио-элемента
    useEffect(() => {
        const updateProgress = () => {
            setCurrentTime(audio.currentTime);
            setDuration(audio.duration || 0);
            setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
        };

        // Обновляем время когда меняется положение в аудио
        audio.addEventListener('timeupdate', updateProgress);
        
        // Также обновляем при загрузке метаданных
        audio.addEventListener('loadedmetadata', updateProgress);
        
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', updateProgress);
        };
    }, [audio]);

    // Регистрируем аудио в сервисе при монтировании
    useEffect(() => {
        if (!channelId) {
            console.error('[AuPlayer] channelId не определен');
            return;
        }
        
        console.log(`[AuPlayer] Использование канала из PlayerContext: ${channelId}`);
        
        // Проверяем, зарегистрирован ли уже канал
        if (!audioChannelService.isChannelRegistered(channelId)) {
            console.log(`[AuPlayer] Регистрация аудио канала: ${channelId}`);
            audioChannelService.registerAudio(channelId, audio);
        } else {
            console.log(`[AuPlayer] Канал ${channelId} уже зарегистрирован`);
        }
        
        // При размонтировании не удаляем регистрацию, так как канал используется PlayerContext
    }, [audio, channelId]);

    // Обработчики событий для UI-элементов
    const handlePlay = useCallback(() => {
        setIsPlaying(true);
    }, [setIsPlaying]);

    const handlePause = useCallback(() => {
        setIsPlaying(false);
    }, [setIsPlaying]);

    const handleSeek = useCallback((e: any) => {
        const seekPosition = e.target.value;
        if (audio && audio.duration) {
            const seekTime = (seekPosition / 100) * audio.duration;
            audio.currentTime = seekTime;
        }
    }, [audio]);

    // Обработчик изменения громкости
    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setVolumeLevel(value);
        setVolume(value / 100);
    }, [setVolume]);

    // Инициализация громкости
    useEffect(() => {
        setVolumeLevel(audio.volume * 100);
        if (volumeSliderRef.current) {
            volumeSliderRef.current.style.setProperty('--volume-width', `${audio.volume * 100}%`);
        }
    }, [audio]);

    // Начальная инициализация громкости
    useEffect(() => {
        // Устанавливаем переменную CSS даже если ползунок не виден
        if (volumeLevel) {
            document.documentElement.style.setProperty('--volume-width', `${volumeLevel}%`);
        }
    }, []);

    // Сбрасываем состояние ошибки обложки при смене трека
    useEffect(() => {
        setCoverError(false);
    }, [currentTrack?.id]);

    // Загрузка треков
    useEffect(() => {
        // Проверяем, уже есть ли треки в очереди
        if (queueTracks.length > 0) {
            setIsLoading(false);
            return; // Не загружаем треки повторно, если они уже загружены
        }

        setIsLoading(true);
        fetchTracks().then(async tracksData => {
            // Загружаем длительность для каждого трека
            const tracksWithDuration = await Promise.all(
                tracksData.map(async (track: Track) => {
                    if (track.audioUrl) {
                        try {
                            const duration = await getAudioDuration(track.audioUrl, track.id);
                            return { ...track, duration };
                        } catch (err) {
                            console.error(`[Music] Ошибка при получении длительности трека ${track.title}:`, err);
                            return track;
                        }
                    }
                    return track;
                })
            );
            
            setQueueTracks(tracksWithDuration);
            setIsLoading(false);
            
            // Если треки загружены, но нет текущего трека, устанавливаем первый трек как текущий
            if (tracksWithDuration.length > 0 && currentTrackIndex === -1) {
                console.log('[Music] Автоматически устанавливаем первый трек:', tracksWithDuration[0]);
                playTrackByIndex(0);
            }
        });
    }, []);

    const fetchTracks = async () => {
        try {
            const data = await api.get(`/music?limit=1000`, {
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
    
            console.log('[Music] Получены треки:', data);
    
            // Проверяем структуру данных
            const tracksData = data.tracks || data;
            
            if (!tracksData || !Array.isArray(tracksData)) {
                console.error('[Music] Некорректный формат данных треков:', data);
                return [];
            }
            
            // Возвращаем массив треков
            return tracksData.map((track: any) => {
                const validTrack: Track = {
                    id: track.id || 0,
                    title: track.title || 'Неизвестный трек',
                    artist: track.artist || 'Неизвестный исполнитель',
                    duration: track.duration || '0:00',
                    coverUrl: track.coverUrl || DEFAULT_COVER_URL,
                    audioUrl: track.filename ? `${API_URL}/music/file/${track.filename}` : '',
                    playCount: track.playCount || 0
                };
    
                if (!validTrack.audioUrl) {
                    console.warn(`[Music] Трек ${validTrack.title} (ID: ${validTrack.id}) не имеет аудио URL`);
                }
    
                return validTrack;
            });
        } catch (err) {
            console.error('[Music] Ошибка при загрузке треков:', err);
            return [];
        }
    };

    // Обработка ошибки загрузки обложки
    const handleCoverError = () => {
        console.warn('[AuPlayer] Ошибка загрузки обложки:', currentTrack?.coverUrl);
        setCoverError(true);
    };

    // Функция для управления видимостью ползунка громкости
    const handleVolumeControlShow = useCallback(() => {
        // Очищаем таймер закрытия, если он был
        if (volumeTimerRef.current) {
            window.clearTimeout(volumeTimerRef.current);
            volumeTimerRef.current = null;
        }
        setShowVolumeSlider(true);
        
        // Обновляем CSS переменную
        setTimeout(() => {
            if (volumeSliderRef.current) {
                volumeSliderRef.current.style.setProperty('--volume-width', `${volumeLevel}%`);
            }
        }, 10);
    }, [volumeLevel]);

    // Функция для скрытия ползунка громкости с задержкой
    const handleVolumeControlHide = useCallback(() => {
        if (volumeTimerRef.current) {
            window.clearTimeout(volumeTimerRef.current);
        }
        volumeTimerRef.current = window.setTimeout(() => {
            setShowVolumeSlider(false);
        }, 200); // небольшая задержка для лучшего UX
    }, []);

    // Очистка таймера при размонтировании
    useEffect(() => {
        return () => {
            if (volumeTimerRef.current) {
                window.clearTimeout(volumeTimerRef.current);
                volumeTimerRef.current = null;
            }
        };
    }, []);

    // Функция для переключения расширенного режима
    const toggleExpandedMode = useCallback(() => {
        if (popupMode) {
            setPopupMode(false);
        }
        setExpandedMode(prev => !prev);
    }, [popupMode]);

    // Функция для переключения режима отдельного окна
    const togglePopupMode = useCallback(() => {
        // Если включаем popup режим, выключаем расширенный, и наоборот
        if (popupMode) {
            document.body.classList.remove('popupModeActive');
            setPopupMode(false);
        } else {
            document.body.classList.add('popupModeActive');
            setExpandedMode(false);
            setPopupMode(true);
        }
    }, [popupMode]);

    // Очистка класса body при размонтировании
    useEffect(() => {
        return () => {
            document.body.classList.remove('popupModeActive');
        };
    }, []);

    // Функция для удаления трека
    const handleDeleteTrack = useCallback((id: number) => {
        // Проверяем, не является ли удаляемый трек текущим
        if (currentTrack && currentTrack.id === id) {
            // Если это текущий трек, останавливаем воспроизведение
            setIsPlaying(false);
            
            // Если есть другие треки, переключаемся на следующий или предыдущий
            if (queueTracks.length > 1) {
                const nextIndex = (currentTrackIndex + 1) % queueTracks.length;
                // Если следующий трек - это удаляемый трек, берем следующий за ним
                if (queueTracks[nextIndex].id === id && queueTracks.length > 2) {
                    playTrackByIndex((nextIndex + 1) % queueTracks.length);
                } else {
                    playTrackByIndex(nextIndex);
                }
            }
        }
        
        // Удаляем трек из списка очереди
        setQueueTracks(prev => prev.filter(track => track.id !== id));
    }, [currentTrack, currentTrackIndex, queueTracks, setIsPlaying, setQueueTracks, playTrackByIndex]);

    // Функция для переключения видимости списка треков в popup режиме
    const toggleTracksVisibility = useCallback(() => {
        setShowTracks(prev => !prev);
    }, []);

    // Открываем плеер в новом окне браузера
    const openInNewWindow = useCallback(() => {
        // Определяем размеры окна
        const width = 550;
        const height = 650;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;

        // Открываем новое окно с плеером
        window.open(
            '/player',
            'MusicPlayer',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=no`
        );
        
        // Теперь все синхронизируется через BroadcastChannel
    }, []);

    // Обработчик для управления воспроизведением через сервис
    const handlePlayPause = useCallback(() => {
        if (!channelId) {
            console.error('[AuPlayer] channelId не определен для воспроизведения');
            return;
        }
        
        if (isPlaying) {
            audioChannelService.pauseActiveChannel();
            setIsPlaying(false);
        } else if (currentTrack) {
            // Проверяем, зарегистрирован ли канал перед воспроизведением
            if (!audioChannelService.isChannelRegistered(channelId)) {
                console.log(`[AuPlayer] Повторная регистрация аудио канала: ${channelId}`);
                audioChannelService.registerAudio(channelId, audio);
            }
            
            audioChannelService.playTrack(channelId, currentTrack, audio.currentTime);
            setIsPlaying(true);
        }
    }, [isPlaying, currentTrack, audio, channelId, setIsPlaying]);

    if (isLoading) {
        return <div>Загрузка...</div>;
    }

    if (!queueTracks.length) {
        return <div className={styles.auPlayerContainer}>
            <div className={styles.selectTrackMessage}>
                Очередь воспроизведения пуста. Добавьте треки из раздела "Моя музыка"
            </div>
        </div>;
    }

    // Если нет текущего трека, показываем только список треков
    if (!currentTrack && queueTracks.length > 0) {
        return (
            <div className={styles.auPlayerContainer}>
                <div className={styles.selectTrackMessage}>
                    Выберите трек для воспроизведения
                </div>
                <AuOrder 
                    tracks={queueTracks} 
                    currentTrackIndex={-1} 
                    onSelectTrack={playTrackByIndex} 
                    onDeleteTrack={handleDeleteTrack}
                />
            </div>
        );
    }

    // Получаем URL обложки
    const coverUrl = currentTrack ? (coverError ? DEFAULT_COVER_URL : getTrackCover(currentTrack.coverUrl)) : '';

    return (
        <div className={`${styles.auPlayerContainer} ${expandedMode ? styles.expandedMode : ''} ${popupMode ? styles.popupMode : ''} ${showTracks ? styles.showTracks : ''} ${isPlaying ? styles.isPlaying : ''}`}>
            {/* Фон с размытой обложкой */}
            {currentTrack && !popupMode && (
                <div 
                    className={styles.playerBackground} 
                    style={{ backgroundImage: `url(${coverUrl})` }}
                />
            )}
            
            {/* Оверлей для popup режима */}
            {popupMode && <div className={styles.popupModeOverlay} onClick={togglePopupMode}></div>}
            
            {/* Кнопки переключения режимов */}
            <div className={styles.viewModeButtons}>
                <button 
                    className={`${styles.toggleViewModeButton} ${expandedMode && !popupMode ? styles.active : ""}`}
                    onClick={toggleExpandedMode}
                    title="Развернутый режим"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14v14z"/>
                        <path d="M7 12h10v2H7z"/>
                        <path d="M7 9h5v2H7z"/>
                    </svg>
                </button>
                
                <button 
                    className={`${styles.popupModeButton} ${popupMode ? styles.active : ""}`}
                    onClick={() => setPopupMode(!popupMode)}
                    title="Режим всплывающего окна"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2zm0 16H5V5h14v14z"/>
                        <path d="M15 5v2h2v2h2V5h-4z"/>
                        <path d="M5 15v4h4v-2H7v-2H5z"/>
                    </svg>
                </button>
                
                <button 
                    className={styles.newWindowButton}
                    onClick={openInNewWindow}
                    title="Открыть в новом окне"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7h-2v7z"/>
                        <path d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                    </svg>
                </button>
            </div>
            
            <div className={styles.playerContent}>
                <div className={styles.trackInfo}>
                    <div className={styles.coverImageContainer}>
                        <img 
                            src={coverUrl} 
                            alt={currentTrack?.title}
                            className={styles.coverImage} 
                            onError={handleCoverError}
                            onClick={toggleExpandedMode}
                            title="Нажмите для переключения режима отображения"
                        />
                        {/* Анимация эквалайзера под обложкой */}
                        <div className={styles.playingAnimation}>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                    <div className={styles.trackDetails}>
                        <div className={styles.trackTitle}>{currentTrack?.title}</div>
                        <div className={styles.trackArtist}>{currentTrack?.artist}</div>
                    </div>
                </div>

                <div className={styles.customPlayerControls}>
                    <div className={styles.playerButtons}>
                        <button 
                            className={`${styles.controlButton} ${styles.modeButton} ${shuffleMode ? styles.activeMode : ''}`} 
                            onClick={toggleShuffle}
                            aria-label="Перемешать"
                            title={shuffleMode ? "Случайное воспроизведение (включено)" : "Случайное воспроизведение (выключено)"}
                        >
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm0.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                            </svg>
                        </button>
                        
                        <button 
                            className={styles.controlButton} 
                            onClick={prevTrack}
                            aria-label="Предыдущий трек"
                        >
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                            </svg>
                        </button>
                        
                        <button 
                            className={`${styles.controlButton} ${styles.playButton}`} 
                            onClick={handlePlayPause}
                            aria-label={isPlaying ? "Пауза" : "Воспроизвести"}
                        >
                            {isPlaying ? (
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                            )}
                        </button>
                        
                        <button 
                            className={styles.controlButton} 
                            onClick={nextTrack}
                            aria-label="Следующий трек"
                        >
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                            </svg>
                        </button>
                        
                        <button 
                            className={`${styles.controlButton} ${styles.modeButton} ${repeatMode !== 'none' ? styles.activeMode : ''}`} 
                            onClick={toggleRepeat}
                            aria-label="Режим повтора"
                            title={
                                repeatMode === 'none' ? "Повтор выключен" : 
                                repeatMode === 'one' ? "Повтор текущего трека" : 
                                "Повтор всей очереди"
                            }
                        >
                            {repeatMode === 'one' ? (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                                </svg>
                            ) : (
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                                </svg>
                            )}
                        </button>

                        <div className={styles.volumeControl}
                             onMouseLeave={handleVolumeControlHide}
                        >
                            <button 
                                className={styles.controlButton}
                                onClick={handleVolumeControlShow}
                                onMouseEnter={handleVolumeControlShow}
                                aria-label="Громкость"
                            >
                                {volumeLevel > 50 ? (
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                    </svg>
                                ) : volumeLevel > 0 ? (
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M7 9v6h4l5 5V4l-5 5H7z M16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02 0-1.77-1.02-3.29-2.5-4.03z"/>
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                                    </svg>
                                )}
                            </button>
                            
                            {showVolumeSlider && (
                                <div 
                                    className={styles.volumeSliderContainer}
                                    onMouseEnter={() => {
                                        // Отменяем таймер скрытия при наведении на ползунок
                                        if (volumeTimerRef.current) {
                                            window.clearTimeout(volumeTimerRef.current);
                                            volumeTimerRef.current = null;
                                        }
                                    }}
                                >
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="100" 
                                        value={volumeLevel} 
                                        className={styles.volumeSlider}
                                        onChange={handleVolumeChange}
                                        aria-label="Громкость"
                                        ref={volumeSliderRef}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className={styles.progressControls}>
                        <span className={styles.timeText}>{formatTrackTime(currentTime)}</span>
                        
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={progress} 
                            className={styles.progressSlider}
                            onChange={handleSeek}
                            ref={progressSliderRef}
                        />
                        
                        <span className={styles.timeText}>{formatTrackTime(duration)}</span>
                    </div>
                </div>
            </div>

            <div className={styles.queueInfo}>
                {shuffleMode && (
                    <div className={styles.queueMode}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm0.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
                        </svg>
                        <span>Случайное воспроизведение</span>
                    </div>
                )}
                {repeatMode !== 'none' && (
                    <div className={styles.queueMode}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                        </svg>
                        <span>
                            {repeatMode === 'one' ? 'Повтор текущего трека' : 'Повтор всей очереди'}
                        </span>
                    </div>
                )}
            </div>

            {/* Кнопка показа/скрытия списка треков в popup режиме */}
            {popupMode && (
                <button 
                    className={styles.toggleTracksButton}
                    onClick={toggleTracksVisibility}
                >
                    {showTracks ? 'Скрыть список треков' : 'Показать список треков'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={showTracks ? styles.rotated : ""}>
                        <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                    </svg>
                </button>
            )}

            <div className={styles.tracksList}>
                <AuOrder 
                    tracks={queueTracks} 
                    currentTrackIndex={currentTrackIndex} 
                    onSelectTrack={playTrackByIndex} 
                    onDeleteTrack={handleDeleteTrack}
                    expandedMode={expandedMode || popupMode}
                />
            </div>
        </div>
    );
};

export default AuPlayer;