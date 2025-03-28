import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/Spinner/Spinner';
import styles from './MusicPage.module.css';
import { Track as DemoTrack, getDemoTracks } from './demoTracks';

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
    const audioRef = useRef<HTMLAudioElement>(null);

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

    const handlePlayTrack = (track: Track) => {
        console.log('Попытка воспроизвести трек:', track);
        if (!track.audioUrl) {
            alert(`Трек "${track.title}" не имеет аудио URL.`);
            return;
        }

        setCurrentTrack(track);
        setIsPlaying(true);
        
        if (audioRef.current) {
            // Устанавливаем аудио источник
            audioRef.current.src = track.audioUrl;
            audioRef.current.load(); // Явно загружаем ресурс
        }

        // Проверка существования аудиофайла
        checkAudioFile(track.audioUrl);
        
        // Увеличиваем счетчик прослушиваний на сервере
        if (track.id && track.id > 0) {
            fetch(`${API_URL}/music/${track.id}/play`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            }).catch(error => {
                console.error('[Music] Ошибка при обновлении счетчика прослушиваний:', error);
            });
        }
    };

    // Функция для проверки доступности аудиофайла
    const checkAudioFile = (url: string) => {
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', url, true);
        xhr.onload = () => {
            console.log(`Статус аудиофайла ${url}: ${xhr.status} ${xhr.statusText}`);
            
            if (xhr.status >= 400) {
                alert(`Ошибка доступа к аудиофайлу. Статус: ${xhr.status}`);
                return;
            }
            
            // Проверка типа контента
            const contentType = xhr.getResponseHeader('Content-Type');
            console.log(`Тип файла: ${contentType}`);
            
            if (contentType && !contentType.includes('audio/')) {
                console.warn(`Предупреждение: Файл может не быть аудио (${contentType})`);
                alert(`Ошибка: файл не является аудиофайлом. Тип: ${contentType}`);
                return;
            }
            
            // Если всё хорошо, начинаем воспроизведение
            if (audioRef.current) {
                console.log('Файл проверен, начинаем воспроизведение');
                try {
                    audioRef.current.play().catch(err => {
                        console.error('Ошибка воспроизведения после проверки:', err);
                        alert(`Ошибка воспроизведения: ${err.message}`);
                    });
                } catch (err) {
                    console.error('Исключение при попытке воспроизведения:', err);
                }
            }
        };
        xhr.onerror = () => {
            console.error(`Не удалось получить доступ к файлу: ${url}`);
            alert('Ошибка проверки аудиофайла. Возможно, проблема с CORS или файл недоступен.');
        };
        xhr.send();
    };

    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };

    const handleNextTrack = () => {
        if (!currentTrack) return;
        
        const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
        if (currentIndex < tracks.length - 1) {
            setCurrentTrack(tracks[currentIndex + 1]);
            setIsPlaying(true);
        }
    };

    const handlePrevTrack = () => {
        if (!currentTrack) return;
        
        const currentIndex = tracks.findIndex(track => track.id === currentTrack.id);
        if (currentIndex > 0) {
            setCurrentTrack(tracks[currentIndex - 1]);
            setIsPlaying(true);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            audioRef.current.volume = Number(e.target.value) / 100;
        }
    };

    const handleUploadTrack = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        
        console.log('[Music] Проверка файла для загрузки');
        const audioFile = formData.get('audioFile') as File;
        if (!audioFile || !audioFile.name) {
            console.log('[Music] Файл не выбран');
            alert('Пожалуйста, выберите аудиофайл');
            return;
        }

        console.log('[Music] Файл выбран:', audioFile.name, audioFile.type, audioFile.size);
        setUploadingTrack(true);
        setUploadProgress(0);

        try {
            console.log('[Music] Создание XHR для загрузки файла');
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/music/upload`, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('Accept', 'application/json');
            
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    console.log(`[Music] Прогресс загрузки: ${progress}%`);
                    setUploadProgress(progress);
                }
            };
            
            xhr.onload = () => {
                console.log('[Music] Загрузка завершена, статус:', xhr.status);
                console.log('[Music] Ответ:', xhr.responseText);
                
                if (xhr.status === 201) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        console.log('[Music] Данные нового трека:', response);
                        
                        const validTrack: Track = {
                            id: response.id || 0,
                            title: response.title || 'Неизвестный трек',
                            artist: response.artist || 'Неизвестный исполнитель',
                            duration: response.duration || 0,
                            coverUrl: response.coverUrl || '/default-cover.jpg',
                            audioUrl: `${API_URL}/music/file/${response.filename}`,
                            playCount: response.playCount || 0
                        };
                        
                        console.log('[Music] Добавление трека в список:', validTrack);
                        setTracks(prev => [validTrack, ...prev]);
                        setUploadingTrack(false);
                        setUploadProgress(0);
                        // Сохраняем ссылку на форму перед вызовом reset
                        const form = e.currentTarget;
                        if (form) {
                            form.reset();
                        }
                    } catch (parseError) {
                        console.error('[Music] Ошибка парсинга ответа:', parseError);
                        setUploadingTrack(false);
                    }
                } else {
                    console.error('[Music] Ошибка при загрузке файла, статус:', xhr.status);
                    setUploadingTrack(false);
                }
            };
            
            xhr.onerror = (error) => {
                console.error('[Music] Ошибка при загрузке файла:', error);
                setUploadingTrack(false);
            };
            
            console.log('[Music] Отправка FormData на сервер');
            xhr.send(formData);
        } catch (error) {
            console.error('[Music] Ошибка при загрузке трека:', error);
            setUploadingTrack(false);
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
                // Если текущий трек удаляется, останавливаем воспроизведение
                if (currentTrack?.id === trackId) {
                    setCurrentTrack(null);
                    setIsPlaying(false);
                }
                
                setTracks(prev => prev.filter(track => track.id !== trackId));
            } else {
                console.error('Ошибка при удалении трека');
            }
        } catch (error) {
            console.error('Ошибка при удалении трека:', error);
        }
    };

    const testApiConnection = async () => {
        try {
            console.log('[Music] Тестирование API...');
            const response = await fetch(`${API_URL}/music/test`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('[Music] Тест API - статус:', response.status);
            const responseText = await response.text();
            console.log('[Music] Тест API - текст ответа:', responseText);
            
            setDebugInfo(`Статус: ${response.status}\nОтвет: ${responseText}`);
            setDebugVisible(true);
        } catch (error) {
            console.error('[Music] Ошибка тестирования API:', error);
            setDebugInfo(`Ошибка: ${error}`);
            setDebugVisible(true);
        }
    };

    const testDirectApiConnection = async () => {
        try {
            console.log('[Music] Прямое тестирование API...');
            
            const response = await fetch(`${API_URL}/music/test`, {
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            console.log('[Music] Прямой тест API - статус:', response.status);
            const responseText = await response.text();
            console.log('[Music] Прямой тест API - текст ответа:', responseText);
            
            setDebugInfo(`ПРЯМОЙ ЗАПРОС\nСтатус: ${response.status}\nОтвет: ${responseText}`);
            setDebugVisible(true);
        } catch (error) {
            console.error('[Music] Ошибка прямого тестирования API:', error);
            setDebugInfo(`ПРЯМОЙ ЗАПРОС\nОшибка: ${error}`);
            setDebugVisible(true);
        }
    };

    const loadDemoTracks = () => {
        // Загружаем демо-треки и назначаем им отрицательные ID для избежания конфликтов
        const demoTracks = getDemoTracks().map((track, index) => ({
            ...track,
            id: -(index + 1000),
            playCount: 0
        }));

        console.log('[Debug] Загружены демо-треки:', demoTracks.map(t => `${t.id}: ${t.title} - ${t.artist}`).join(', '));
        setTracks(demoTracks);
        setDebugInfo('Демо-треки загружены');
    };

    const testAudioPlayback = () => {
        // Создаем тестовый трек с известным рабочим аудио URL
        // Используем MP3 формат для лучшей кросс-браузерной совместимости
        const testTrack: Track = {
            id: -9999, // Гарантированно уникальный ID
            title: "Тестовый трек",
            artist: "Тестовый исполнитель",
            duration: "0:30",
            coverUrl: "https://via.placeholder.com/300",
            // MP3 файл с GitHub - публичный репозиторий с тестовыми аудиофайлами
            audioUrl: "https://github.com/anars/blank-audio/raw/master/250-milliseconds-of-silence.mp3",
            playCount: 0
        };
        
        console.log('[Music] Тестовое воспроизведение:', testTrack);
        setCurrentTrack(testTrack);
        setIsPlaying(true);
        setDebugInfo(`Тестовое воспроизведение:\nURL аудио: ${testTrack.audioUrl}`);
        setDebugVisible(true);
    };

    // Если страница загружается в первый раз, показываем индикатор загрузки
    if (isLoading && tracks.length === 0) {
        return (
            <div className={styles.centeredContainer}>
                <div className={styles.loading}>Загрузка треков...</div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Музыка</h1>
                <p className={styles.subtitle}>Слушайте и добавляйте в плейлисты</p>
                <div className={styles.debugButtons}>
                    <button 
                        onClick={testApiConnection} 
                        className={styles.debugButton}
                        title="Тест API через прокси"
                    >
                        Тест API (прокси)
                    </button>
                    <button 
                        onClick={testDirectApiConnection} 
                        className={styles.debugButton}
                        title="Прямой тест API"
                    >
                        Тест API (прямой)
                    </button>
                    <button 
                        onClick={loadDemoTracks} 
                        className={styles.debugButton}
                        title="Использовать демо-треки"
                    >
                        Демо-треки
                    </button>
                    <button 
                        onClick={testAudioPlayback} 
                        className={styles.debugButton}
                        title="Тестовое воспроизведение"
                    >
                        Тестовое воспроизведение
                    </button>
                </div>
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
                <div className={styles.uploadSection}>
                    <h2 className={styles.sectionTitle}>Загрузить трек</h2>
                    <form className={styles.uploadForm} onSubmit={handleUploadTrack}>
                        <div className={styles.formGroup}>
                            <label htmlFor="title">Название</label>
                            <input 
                                type="text" 
                                id="title" 
                                name="title" 
                                placeholder="Название трека"
                                className={styles.formInput}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="artist">Исполнитель</label>
                            <input 
                                type="text" 
                                id="artist" 
                                name="artist" 
                                placeholder="Имя исполнителя"
                                className={styles.formInput}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="audioFile">Аудиофайл (MP3, WAV, OGG)</label>
                            <input 
                                type="file" 
                                id="audioFile" 
                                name="audioFile" 
                                accept=".mp3,.wav,.ogg,audio/mp3,audio/mpeg,audio/wav,audio/wave,audio/ogg" 
                                className={styles.formFile}
                                required
                            />
                        </div>
                        <button 
                            type="submit" 
                            className={styles.uploadButton}
                            disabled={uploadingTrack}
                        >
                            {uploadingTrack ? 'Загрузка...' : 'Загрузить'}
                        </button>
                    </form>
                    {uploadingTrack && (
                        <div className={styles.progressBar}>
                            <div 
                                className={styles.progressFill} 
                                style={{ width: `${uploadProgress}%` }}
                            />
                            <span className={styles.progressText}>{uploadProgress}%</span>
                        </div>
                    )}
                </div>

                <h2 className={styles.sectionTitle}>Мои треки</h2>
                <div className={styles.trackList}>
                    <div className={styles.trackHeader}>
                        <div className={styles.trackNumber}>#</div>
                        <div className={styles.trackTitle}>НАЗВАНИЕ</div>
                        <div className={styles.trackArtist}>ИСПОЛНИТЕЛЬ</div>
                        <div className={styles.trackDuration}>ДЛИТЕЛЬНОСТЬ</div>
                    </div>
                    {tracks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p>У вас пока нет загруженных треков</p>
                        </div>
                    ) : (
                        tracks.map((track, index) => (
                            <div 
                                key={track.id} 
                                className={`${styles.trackItem} ${currentTrack?.id === track.id ? styles.activeTrack : ''}`}
                                onClick={() => handlePlayTrack(track)}
                            >
                                <div className={styles.trackNumber}>
                                    {currentTrack?.id === track.id && isPlaying ? (
                                        <div className={styles.playingIcon}>
                                            <span></span><span></span><span></span>
                                        </div>
                                    ) : (
                                        index + 1
                                    )}
                                </div>
                                <div className={styles.trackInfo}>
                                    <img 
                                        src={track.coverUrl} 
                                        alt={track.title} 
                                        className={styles.trackCover} 
                                    />
                                    <div className={styles.trackTitle}>{track.title}</div>
                                </div>
                                <div className={styles.trackArtist}>{track.artist}</div>
                                <div className={styles.trackDuration}>{track.duration}</div>
                                <div className={styles.trackActions}>
                                    <button 
                                        className={styles.deleteButton}
                                        onClick={(e) => handleDeleteTrack(track.id, e)}
                                        title="Удалить трек"
                                    >
                                        <svg fill="currentColor" width="20" height="20" viewBox="0 0 24 24">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {currentTrack && (
                <div className={styles.player}>
                    <div className={styles.playerInfo}>
                        <img 
                            src={currentTrack.coverUrl} 
                            alt={currentTrack.title} 
                            className={styles.playerCover} 
                        />
                        <div className={styles.playerTrackInfo}>
                            <div className={styles.playerTitle}>{currentTrack.title}</div>
                            <div className={styles.playerArtist}>{currentTrack.artist}</div>
                        </div>
                    </div>
                    <div className={styles.playerControls}>
                        <button 
                            className={styles.prevButton}
                            onClick={handlePrevTrack}
                        >
                            <svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                                <path d="M7 6c.55 0 1 .45 1 1v10c0 .55-.45 1-1 1s-1-.45-1-1V7c0-.55.45-1 1-1zm3.66 6.82l5.77 4.07c.66.47 1.58-.01 1.58-.82V7.93c0-.81-.91-1.28-1.58-.82l-5.77 4.07a1 1 0 0 0 0 1.64z"/>
                            </svg>
                        </button>
                        <button 
                            className={styles.playPauseButton}
                            onClick={togglePlayPause}
                        >
                            {isPlaying ? (
                                <svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                                    <path d="M8 19c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2zm8-2V7c0-1.1-.9-2-2-2s-2 .9-2 2v10c0 1.1.9 2 2 2s2-.9 2-2z"/>
                                </svg>
                            ) : (
                                <svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                                    <path d="M8 6.82v10.36c0 .79.87 1.27 1.54.84l8.14-5.18a1 1 0 0 0 0-1.69L9.54 5.98A.998.998 0 0 0 8 6.82z"/>
                                </svg>
                            )}
                        </button>
                        <button 
                            className={styles.nextButton}
                            onClick={handleNextTrack}
                        >
                            <svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                                <path d="M7.58 16.89l5.77-4.07a1 1 0 0 0 0-1.63l-5.77-4.08c-.66-.47-1.58 0-1.58.81v8.17c0 .8.91 1.28 1.58.81zM16 7c.55 0 1 .45 1 1v8c0 .55-.45 1-1 1s-1-.45-1-1V8c0-.55.45-1 1-1z"/>
                            </svg>
                        </button>
                    </div>
                    <div className={styles.playerVolume}>
                        <svg fill="currentColor" width="24" height="24" viewBox="0 0 24 24">
                            <path d="M3 10v4c0 .55.45 1 1 1h3l3.29 3.29c.63.63 1.71.18 1.71-.71V6.41c0-.89-1.08-1.33-1.71-.7L7 9H4c-.55 0-1 .45-1 1zm13.5 2A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 4.45v.2c0 .38.25.71.6.85C17.18 6.53 19 9.06 19 12s-1.82 5.47-4.4 6.5c-.36.14-.6.47-.6.85v.2c0 .63.63 1.07 1.21.85C18.6 19.11 21 15.84 21 12s-2.4-7.11-5.79-8.4c-.58-.23-1.21.22-1.21.85z"/>
                        </svg>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            defaultValue="80" 
                            className={styles.volumeSlider}
                            onChange={handleVolumeChange}
                        />
                    </div>
                </div>
            )}

            {/* Аудио элемент для воспроизведения музыки */}
            <audio ref={audioRef} />
            
            {/* Отладочная информация о текущем треке */}
            {currentTrack && debugVisible && (
                <div className={styles.debugPanel}>
                    <div className={styles.debugHeader}>
                        <h3>Текущий трек</h3>
                        <button onClick={() => setDebugVisible(false)}>Закрыть</button>
                    </div>
                    <pre className={styles.debugContent}>
                        ID: {currentTrack.id}
                        Название: {currentTrack.title}
                        Исполнитель: {currentTrack.artist}
                        URL аудио: {currentTrack.audioUrl}
                        URL обложки: {currentTrack.coverUrl}
                    </pre>
                </div>
            )}

            {error && (
                <div className={styles.errorContainer}>
                    <div className={styles.errorMessage}>
                        <h3>Ошибка:</h3>
                        <p>{error}</p>
                        <button 
                            className={styles.button} 
                            onClick={loadDemoTracks}
                        >
                            Загрузить демо-треки
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}; 