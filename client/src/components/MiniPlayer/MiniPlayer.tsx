import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router-dom';
import styles from './MiniPlayer.module.css';


// Константа для обложки по умолчанию
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

const MiniPlayer: React.FC = () => {
    const { 
        currentTrack, 
        isPlaying, 
        togglePlay, 
        nextTrack, 
        prevTrack,
        tracks,
        audio,
        getTrackCover,
        setCurrentTrackIndex,
        isPlayerWindowOpen
    } = usePlayer();
    const { user } = useAuth();
    const [progress, setProgress] = useState(0);
    const [coverError, setCoverError] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [volume, setVolume] = useState(() => audio?.volume || 1);
    const [coverErrors, setCoverErrors] = useState<Record<number, boolean>>({});
    const panelRef = useRef<HTMLDivElement>(null);
    const [coverUrl, setCoverUrl] = useState(DEFAULT_COVER_URL);
    const [playerWindow, setPlayerWindow] = useState<Window | null>(null);

    useEffect(() => {
        const updateProgress = () => {
            if (audio && audio.duration) {
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        audio.addEventListener('timeupdate', updateProgress);
        
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
        };
    }, [audio]);

    // Сбрасываем состояние ошибки обложки при смене трека
    useEffect(() => {
        setCoverError(false);
    }, [currentTrack?.id]);

    // Получаем URL обложки для основного отображения в плеере
    useEffect(() => {
        if (!currentTrack) return;
        
        // Используем функцию getTrackCover для получения правильного URL обложки
        const source = getTrackCover(currentTrack.coverUrl);
        setCoverUrl(source);
    }, [currentTrack, getTrackCover, coverError]);

    // Инициализация громкости
    useEffect(() => {
        if (audio) {
            setVolume(audio.volume);
        }
    }, [audio]);

    // Закрытие панели при клике вне
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(event.target as Node) && 
                event.target instanceof Element && !event.target.closest(`.${styles.miniPlayer}`)) {
                setIsExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Отслеживаем состояние окна плеера
    useEffect(() => {
        // Проверка состояния окна периодически
        const checkWindow = () => {
            if (playerWindow && playerWindow.closed) {
                // Окно закрыто, нужно обновить состояние
                setPlayerWindow(null);
                localStorage.setItem('player_window_closed', Date.now().toString());
            }
        };
        
        const interval = setInterval(checkWindow, 1000);
        
        return () => {
            clearInterval(interval);
        };
    }, [playerWindow]);

    // Если нет текущего трека или открыто отдельное окно плеера, не отображаем мини-плеер
    if (!currentTrack || isPlayerWindowOpen) {
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
        setCurrentTrackIndex(index);
        setIsExpanded(false);
    };

    // Управление громкостью
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audio && !isPlayerWindowOpen) {
            audio.volume = newVolume;
        }
    };

    // Переключение раскрытия панели
    const toggleExpand = () => {
        if (isPlayerWindowOpen) return;
        setIsExpanded(!isExpanded);
    };

    // Открытие плеера в отдельном окне
    const openPlayerWindow = () => {
        // Сохраняем текущее состояние перед открытием
        if (currentTrack) {
            console.log('Открытие окна плеера с текущим треком:', currentTrack.title);
            
            // Получаем текущее состояние плеера
            const currentPosition = audio ? audio.currentTime : 0;
            const currentVolume = audio ? audio.volume : 1;
            
            // Сохраняем состояние в localStorage для передачи в новое окно
            localStorage.setItem('player_current_track', JSON.stringify(currentTrack));
            localStorage.setItem('player_current_position', String(currentPosition));
            localStorage.setItem('player_current_volume', String(currentVolume));
            localStorage.setItem('player_is_playing', String(isPlaying));
        }
        
        const newWindow = window.open(
            '/player',
            'playerWindow',
            'width=550,height=630,resizable=yes,scrollbars=no,status=no,location=no,toolbar=no,menubar=no'
        );
        
        if (newWindow) {
            // Фокусируем новое окно и сохраняем ссылку на него
            newWindow.focus();
            setPlayerWindow(newWindow);
            
            // Отключаем звук в мини-плеере
            if (audio) {
                audio.muted = true;
                
                // Если трек играет, делаем паузу в мини-плеере
                if (!audio.paused) {
                    console.log('Музыка играет, заглушаем звук в мини-плеере');
                }
            }
            
            console.log('Окно плеера успешно открыто');
        } else {
            console.error('Не удалось открыть окно плеера');
        }
    };

    // Закрытие плеера в отдельном окне
    const closePlayerWindow = () => {
        if (playerWindow && !playerWindow.closed) {
            playerWindow.close();
            setPlayerWindow(null);
            localStorage.setItem('player_window_closed', Date.now().toString());
            // Включаем звук обратно в мини-плеере
            if (audio) {
                audio.muted = false;
            }
        }
    };

    return (
        <div className={`${styles.miniPlayer} ${isExpanded ? styles.expanded : ''}`}>
            <div className={styles.trackInfo}>
                <img 
                    src={coverUrl} 
                    alt={currentTrack.title} 
                    className={styles.coverImage} 
                    onError={handleCoverError}
                />
                <div className={styles.trackDetails}>
                    <div className={styles.trackTitle} title={currentTrack.title}>
                        {currentTrack.title}
                    </div>
                    <div className={styles.trackArtist} title={currentTrack.artist}>
                        {currentTrack.artist}
                    </div>
                    <div className={styles.progressBar}>
                        <div 
                            className={styles.progressFilled} 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
            <div className={styles.controls}>
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
                    onClick={togglePlay}
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
            </div>
            <div className={styles.rightControls}>
                <button 
                    className={`${styles.controlButton} ${styles.popupWindowButton}`}
                    onClick={playerWindow ? closePlayerWindow : openPlayerWindow}
                    title={playerWindow ? "Закрыть отдельное окно" : "Открыть в отдельном окне"}
                    aria-label={playerWindow ? "Закрыть отдельное окно" : "Открыть в отдельном окне"}
                >
                    {playerWindow ? (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                            <path d="M18 7h4v2h-4v4h-2V9h-4V7h4V3h2v4zm-8 13H4v-6h2v4h4v2z"/>
                        </svg>
                    )}
                </button>
                <button 
                    className={styles.toggleButton} 
                    onClick={toggleExpand}
                    aria-label={isExpanded ? "Скрыть очередь" : "Показать очередь"}
                >
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d={isExpanded 
                            ? "M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" 
                            : "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z"}/>
                    </svg>
                </button>
                <Link to="/music" className={styles.expandLink} title="Открыть полный плеер">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                    </svg>
                </Link>
            </div>
            
            <div className={styles.expandPanel} ref={panelRef}>
                <div className={styles.queueTitle}>
                    <span>Очередь воспроизведения</span>
                    <span>{tracks.length} треков</span>
                </div>
                
                <div className={styles.trackQueue}>
                    {tracks.map((track, index) => {
                        const isCurrentTrack = currentTrack && track.id === currentTrack.id;
                        // Получаем URL обложки с проверкой ошибок
                        const trackCoverUrl = coverErrors[track.id] 
                            ? DEFAULT_COVER_URL
                            : getTrackCover(track.coverUrl);
                        
                        return (
                            <div 
                                key={track.id}
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
                                    <div className={styles.queueControls}>
                                        <div className={styles.playingIcon}>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                
                <div className={styles.volumeControl}>
                    <div className={styles.volumeSlider}>
                        <div className={styles.volumeIcon}>
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
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
                            className={styles.volumeRange}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MiniPlayer; 