import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/Spinner/Spinner';
import styles from './MusicPage.module.css';
import { Track as DemoTrack, getDemoTracks } from './demoTracks';
import AuPlayerWrap from '../components/AuPlayer/wrap/AuPlayWrap';
import AuOrder from '../components/AuPlayer/AuOrder';
import { usePlayer } from '../contexts/PlayerContext';
import UploadAudio from '../components/UploadAudio';
// Получаем URL API из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || 'http://localhost:3000/api/media';

interface Track {
    id: number;
    title: string;
    artist: string;
    duration: string;
    coverUrl: string;
    audioUrl: string;
    playCount: number;
}

// Перечисление для вкладок
enum TabType {
    MyMusic = 'my-music',
    Queue = 'queue'
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
    const { 
        playTrack, 
        currentTrack: playerTrack, 
        isPlaying: playerIsPlaying, 
        getTrackCover,
        tracks: queueTracks,
        setTracks: setQueueTracks,
        addToQueue
    } = usePlayer();

    useEffect(() => {
        fetchTracks();
    }, []);

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

    const fetchTracks = () => {
        setIsLoading(true);
        setError(null);
        
        fetch(`${API_URL}/music`, {
            headers: {
                'Accept': 'application/json'
            },
            credentials: 'include'
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
                const validatedTracks = data.map((track: any) => {
                    const validTrack: Track = {
                        id: track.id || 0,
                        title: track.title || 'Неизвестный трек',
                        artist: track.artist || 'Неизвестный исполнитель',
                        duration: track.duration || 0,
                        coverUrl: track.coverUrl || '/default-cover.jpg',
                        // Для трека с сервера используем файловый маршрут
                        audioUrl: track.filename ? `${API_URL}/music/file/${track.filename}` : '',
                        playCount: track.playCount || 0
                    };
                    
                    // Проверяем наличие аудио URL
                    if (!validTrack.audioUrl) {
                        console.warn(`[Music] Трек ${validTrack.title} (ID: ${validTrack.id}) не имеет аудио URL`);
                    }
                    
                    // Проверяем валидность обложки
                    if (validTrack.coverUrl && validTrack.coverUrl !== '/default-cover.jpg') {
                        // Создаем изображение для проверки загрузки
                        const img = new Image();
                        img.onerror = () => {
                            console.warn(`[Music] Невалидная обложка для трека ${validTrack.title}: ${validTrack.coverUrl}`);
                            // Обновляем трек в массиве с плейсхолдером вместо битой обложки
                            setTracks(current => 
                                current.map(t => 
                                    t.id === validTrack.id ? { ...t, coverUrl: '/default-cover.jpg' } : t
                                )
                            );
                        };
                        img.src = validTrack.coverUrl;
                    }
                    
                    return validTrack;
                });
                
                setTracks(validatedTracks);
            })
            .catch(err => {
                console.error('[Music] Ошибка при загрузке треков:', err);
                setError(`Не удалось загрузить треки: ${err.message}`);
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    // Обработчик для выбора трека из списка "Моя музыка"
    const handleSelectTrack = (track: Track) => {
        console.log('[Music] Выбран трек из списка:', track);
        
        // Начинаем воспроизведение трека напрямую
        // playTrack сам добавит трек в очередь, если его там нет
        playTrack(track);
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
            const response = await fetch(`${API_URL}/music/${trackId}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            
            if (response.ok) {
                // Удаляем трек из списка треков
                setTracks(prev => prev.filter(track => track.id !== trackId));
                
                // Также удаляем его из очереди, если он там есть
                setQueueTracks(prev => prev.filter(track => track.id !== trackId));
            } else {
                console.error('Ошибка при удалении трека');
            }
        } catch (error) {
            console.error('Ошибка при удалении трека:', error);
        }
    };

    // Обработчик для добавления нового трека после загрузки
    const handleTrackUploaded = (newTrack: Track) => {
        console.log('[Music] Добавлен новый трек:', newTrack);
        setTracks(prev => [newTrack, ...prev]);
    };

    // Вкладка "Моя музыка"
    const renderMyMusicTab = () => {
        if (isLoading && tracks.length === 0) {
            return (
                <div className={styles.loading}>
                    <Spinner />
                    <p>Загрузка ваших треков...</p>
                </div>
            );
        }
        
        if (error) {
            return (
                <div className={styles.errorMessage}>
                    {error}
                </div>
            );
        }
        
        if (tracks.length === 0) {
            return (
                <div className={styles.emptyState}>
                    <p>У вас пока нет загруженных треков</p>
                    <p>Нажмите на кнопку "+" в правом нижнем углу, чтобы добавить новый трек</p>
                </div>
            );
        }
        
        return (
            <div className={styles.trackList}>
                <div className={styles.trackListHeader}>
                    <div className={styles.trackCount}>
                        Найдено: {tracks.length} {tracks.length === 1 ? 'трек' : 
                                  tracks.length < 5 ? 'трека' : 'треков'}
                    </div>
                </div>
                <div className={styles.trackHeader}>
                    <div>#</div>
                    <div>Название</div>
                    <div>Исполнитель</div>
                    <div>Длительность</div>
                    <div></div>
                </div>
                
                {tracks.map((track, index) => {
                    const isCurrentTrack = playerTrack && playerTrack.id === track.id;
                    const coverUrl = track.coverUrl;
                    
                    return (
                        <div 
                            key={track.id} 
                            className={`${styles.trackItem} ${isCurrentTrack ? styles.activeTrack : ''}`}
                            onClick={() => handleSelectTrack(track)}
                        >
                            <div className={styles.trackNumber}>
                                {isCurrentTrack && playerIsPlaying ? (
                                    <div className={styles.playingIcon}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                ) : (
                                    index + 1
                                )}
                            </div>
                            
                            <div className={styles.trackInfo}>
                                <img 
                                    src={coverUrl} 
                                    alt={track.title} 
                                    className={styles.trackCover}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/default-cover.jpg';
                                    }}
                                />
                                <div className={styles.trackTitle}>{track.title}</div>
                            </div>
                            
                            <div className={styles.trackArtist}>{track.artist}</div>
                            <div className={styles.trackDuration}>{track.duration}</div>
                            
                            <div className={styles.trackActions}>
                                <button 
                                    className={styles.queueButton}
                                    onClick={(e) => handleAddToQueue(track, e)}
                                    title="Добавить в очередь"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z"/>
                                    </svg>
                                </button>
                                <button 
                                    className={styles.deleteButton}
                                    onClick={(e) => handleDeleteTrack(track.id, e)}
                                    title="Удалить трек"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
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
            <div className={styles.trackList}>
                <div className={styles.trackListHeader}>
                    <div className={styles.trackCount}>
                        В очереди: {queueTracks.length} {queueTracks.length === 1 ? 'трек' : 
                                    queueTracks.length < 5 ? 'трека' : 'треков'}
                    </div>
                </div>
                <div className={styles.trackHeader}>
                    <div>#</div>
                    <div>Название</div>
                    <div>Исполнитель</div>
                    <div>Длительность</div>
                    <div></div>
                </div>
                
                {queueTracks.map((track, index) => {
                    const isCurrentTrack = playerTrack && playerTrack.id === track.id;
                    const coverUrl = track.coverUrl;
                    
                    return (
                        <div 
                            key={`queue-${track.id}-${index}`} 
                            className={`${styles.trackItem} ${isCurrentTrack ? styles.activeTrack : ''}`}
                            onClick={() => playTrack(track)}
                        >
                            <div className={styles.trackNumber}>
                                {isCurrentTrack && playerIsPlaying ? (
                                    <div className={styles.playingIcon}>
                                        <span></span>
                                        <span></span>
                                        <span></span>
                                    </div>
                                ) : (
                                    index + 1
                                )}
                            </div>
                            
                            <div className={styles.trackInfo}>
                                <img 
                                    src={coverUrl} 
                                    alt={track.title} 
                                    className={styles.trackCover}
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).src = '/default-cover.jpg';
                                    }}
                                />
                                <div className={styles.trackTitle}>{track.title}</div>
                            </div>
                            
                            <div className={styles.trackArtist}>{track.artist}</div>
                            <div className={styles.trackDuration}>{track.duration}</div>
                            
                            <div className={styles.trackActions}>
                                <button 
                                    className={styles.deleteButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        // Удаляем трек из очереди
                                        setQueueTracks(prev => prev.filter((t, i) => i !== index));
                                    }}
                                    title="Удалить из очереди"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19 13H5v-2h14v2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // Переключение между обычным и расширенным режимом
    const toggleViewMode = () => {
        setExpandedView(!expandedView);
    };

    // Получаем URL обложки для фона
    const coverUrl = playerTrack ? (coverError ? '/default-cover.jpg' : getTrackCover(playerTrack.coverUrl)) : '';

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
                            src={playerTrack.coverUrl} 
                            onError={handleBackgroundCoverError} 
                            style={{ display: 'none' }} 
                            alt="" 
                        />
                    </>
                )}
                <div className={styles.header}>
                    <h1 className={styles.title}>Музыка</h1>
                    <p className={styles.subtitle}>Слушайте и добавляйте в плейлисты</p>
                    
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
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === TabType.MyMusic ? renderMyMusicTab() : renderQueueTab()}
                    </div>
                </div>

                {/* Добавляем компонент загрузки аудио */}
                <UploadAudio onTrackUploaded={handleTrackUploaded} />

                {/* Аудио плеер - передаем флаг expandedMode */}
                <div className={styles.playerContainer}>
                    <div className={expandedView ? styles.playerExpanded : ''}>
                        <AuPlayerWrap expandedMode={expandedView} />
                    </div>
                </div>
            </div>
        </div>
    );
}; 