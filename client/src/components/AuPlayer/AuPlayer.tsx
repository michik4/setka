import { useState, useEffect, useRef, useCallback } from 'react';
import AudioPlayer, { RHAP_UI } from 'react-h5-audio-player';
import 'react-h5-audio-player/lib/styles.css';
import { api } from '../../utils/api';
import { Track } from '../../types/music.types';
import AuOrder from './AuOrder';
import styles from './AuPlayer.module.css';
import { usePlayer } from '../../contexts/PlayerContext';
// import 'react-h5-audio-player/lib/styles.less' Use LESS
// import 'react-h5-audio-player/src/styles.scss' Use SASS

// Получаем URL API из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || 'http://localhost:3000/api/media';

// Функция для форматирования времени в формат MM:SS
const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

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
            const duration = formatTime(audio.duration);
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
        getTrackCover
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
            console.log(`[AuPlayer] Обновляю переменную громкости: ${volumeLevel}%`);
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
            console.log(`[AuPlayer] Инициализация переменной громкости: ${volumeLevel}%`);
        }
    }, []);

    // Сбрасываем состояние ошибки обложки при смене трека
    useEffect(() => {
        setCoverError(false);
    }, [currentTrack?.id]);

    // Загрузка треков
    useEffect(() => {
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
            const data = await api.get(`/music`, {
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
    
            console.log('[Music] Получены треки:', data);
    
            // Возвращаем массив треков
            return data.map((track: any) => {
                const validTrack: Track = {
                    id: track.id || 0,
                    title: track.title || 'Неизвестный трек',
                    artist: track.artist || 'Неизвестный исполнитель',
                    duration: track.duration || '0:00',
                    coverUrl: track.coverUrl || '/default-cover.jpg',
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
        setExpandedMode(prev => !prev);
    }, []);

    // Функция для удаления трека
    const handleDeleteTrack = useCallback((id: number) => {
        console.log('[AuPlayer] Запрос на удаление трека из очереди:', id);
        
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
    const coverUrl = currentTrack ? (coverError ? '/default-cover.jpg' : getTrackCover(currentTrack.coverUrl)) : '';

    // Форматируем время для отображения
    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className={`${styles.auPlayerContainer} ${expandedMode ? styles.expandedMode : ''}`}>
            {/* Фон с размытой обложкой */}
            {currentTrack && (
                <div 
                    className={styles.playerBackground} 
                    style={{ backgroundImage: `url(${coverUrl})` }}
                />
            )}
            
            {/* Кнопка переключения режима */}
            <button 
                className={styles.toggleViewModeButton}
                onClick={toggleExpandedMode}
                title={expandedMode ? "Компактный режим" : "Расширенный режим"}
            >
                {expandedMode ? (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
                    </svg>
                )}
            </button>
            
            <div className={styles.playerContent}>
                <div className={styles.trackInfo}>
                    <img 
                        src={coverUrl} 
                        alt={currentTrack?.title}
                        className={styles.coverImage} 
                        onError={handleCoverError}
                        onClick={toggleExpandedMode}
                        style={{ cursor: 'pointer' }}
                        title="Нажмите для переключения режима отображения"
                    />
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
                            onClick={() => setIsPlaying(!isPlaying)}
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
                        <span className={styles.timeText}>{formatTime(currentTime)}</span>
                        
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={progress} 
                            className={styles.progressSlider}
                            onChange={handleSeek}
                            ref={progressSliderRef}
                        />
                        
                        <span className={styles.timeText}>{formatTime(duration)}</span>
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

            <div className={styles.tracksList}>
                <AuOrder 
                    tracks={queueTracks} 
                    currentTrackIndex={currentTrackIndex} 
                    onSelectTrack={playTrackByIndex} 
                    onDeleteTrack={handleDeleteTrack}
                    expandedMode={expandedMode}
                />
            </div>
        </div>
    );
};

export default AuPlayer;