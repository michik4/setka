import React, { useState, useEffect, useRef } from 'react';
import { usePlayer } from '../../contexts/PlayerContext';
import { usePlayerWindow } from '../../contexts/PlayerWindowContext';
import styles from './PlayerWindow.module.css';

// Константа для обложки по умолчанию
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

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
    return (
        <div className={styles.queueView}>
            <h2 className={styles.queueTitle}>
                Очередь воспроизведения
                <span className={styles.queueCount}>{queue.length} треков</span>
            </h2>
            
            <div className={styles.queueList}>
                {queue.map((track, index) => {
                    const isActive = currentTrack && track.id === currentTrack.id;
                    
                    return (
                        <div 
                            key={track.id}
                            className={`${styles.queueItem} ${isActive ? styles.queueItemActive : ''}`}
                            onClick={() => onTrackSelect(index)}
                        >
                            <div className={styles.queueItemMain}>
                                <img 
                                    src={track.coverUrl || '/default-cover.png'} 
                                    alt={track.title} 
                                    className={styles.queueItemCover}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/default-cover.png';
                                    }}
                                />
                                <div className={styles.queueItemInfo}>
                                    <div className={styles.queueItemTitle}>{track.title}</div>
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

            <div className={styles.backToPlayerButton}>
                <button onClick={onBackToPlayer}>
                    Вернуться к плееру
                </button>
            </div>
        </div>
    );
};

const PlayerWindow: React.FC = () => {
    const { 
        playTrack, 
        isPlaying, 
        setIsPlaying, 
        audio,
        tracks,
        currentTrack,
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
        removeTrackFromQueue
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
            becomeMasterPlayer();
            becameMasterRef.current = true;
        }
    }, [isMasterPlayer, becomeMasterPlayer]);

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

    // Обновление обложек при изменении текущего трека или очереди
    useEffect(() => {
        if (!currentTrack || tracks.length === 0) return;
        
        // Находим индекс текущего трека в очереди
        const currentIndex = tracks.findIndex(
            (track) => track.id === currentTrack.id
        );
        
        // Если индекс найден, определяем предыдущий и следующий треки
        if (currentIndex !== -1) {
            // Предыдущий трек (с учетом цикличности при активном режиме repeat)
            const prevIndex = currentIndex > 0 
                ? currentIndex - 1 
                : (repeatMode !== 'none' ? tracks.length - 1 : -1);
            
            // Следующий трек (с учетом цикличности при активном режиме repeat)
            const nextIndex = currentIndex < tracks.length - 1 
                ? currentIndex + 1 
                : (repeatMode !== 'none' ? 0 : -1);
            
            // Устанавливаем обложки, если треки существуют
            setPrevTrackCover(prevIndex !== -1 ? 
                tracks[prevIndex].coverUrl || '/default-cover.png' : null);
            
            setNextTrackCover(nextIndex !== -1 ? 
                tracks[nextIndex].coverUrl || '/default-cover.png' : null);
        }
    }, [currentTrack, tracks, repeatMode]);

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

    // Обработчики кнопок управления плеером
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
        
        // Переходим к предыдущему треку
        prevTrack();
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

    // Обработчики кнопок управления плеером с использованием оптимизированной обработки
    const handleToggleRepeat = () => {
        optimizeOperation(() => {
            toggleRepeat();
        });
    };

    const handleToggleShuffle = () => {
        optimizeOperation(() => {
            toggleShuffle();
        });
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

    // Переключение отображения очереди
    const toggleQueueView = () => {
        setShowQueue(!showQueue);
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
                        backgroundImage: `url(${currentTrack.coverUrl || '/default-cover.png'})`,
                    }}
                />
            )}

            {/* Заголовок окна */}
            <div className={styles.windowHeader}>
                <h1 className={styles.windowTitle}>
                    Музыкальный плеер
                    {isMasterPlayer && (
                        <span className={styles.masterBadge}> (Основной)</span>
                    )}
                </h1>
                {!showQueue && (
                    <button
                        className={styles.queueButton}
                        onClick={toggleQueueView}
                    >
                        Очередь ({tracks.length})
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
                    // Вид очереди воспроизведения
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
                                    {prevTrackCover && (
                                        <div className={styles.sideTrackCover + ' ' + styles.prevTrackCover}>
                                            <img
                                                src={prevTrackCover}
                                                alt="Предыдущий трек"
                                                className={styles.sideTrackImage}
                                            />
                                        </div>
                                    )}
                                    
                                    <div className={styles.coverContainer}>
                                        <img
                                            src={
                                                currentTrack.coverUrl ||
                                                "/default-cover.png"
                                            }
                                            alt={`${currentTrack.title} обложка`}
                                            className={styles.coverImage}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src =
                                                    "/default-cover.png";
                                            }}
                                        />
                                    </div>
                                    
                                    {nextTrackCover && (
                                        <div className={styles.sideTrackCover + ' ' + styles.nextTrackCover}>
                                            <img
                                                src={nextTrackCover}
                                                alt="Следующий трек"
                                                className={styles.sideTrackImage}
                                            />
                                        </div>
                                    )}
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
                                            title="Перемешать"
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
                                            className={`${styles.controlButton} ${
                                                repeatMode
                                                    ? styles.activeMode
                                                    : styles.modeButton
                                            }`}
                                            onClick={handleToggleRepeat}
                                            title="Повтор"
                                        >
                                            <IconRepeat />
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