import React, { createContext, useContext, useState, useEffect } from 'react';
import { Track } from '../types/music.types';
import { api } from '../utils/api';

// Добавляем константу для плейсхолдера обложки
const DEFAULT_COVER_URL = '/default-cover.jpg';

export interface PlayerContextProps {
    tracks: Track[];
    currentTrack: Track | null;
    currentTrackIndex: number;
    isPlaying: boolean;
    audio: HTMLAudioElement;
    repeatMode: 'none' | 'one' | 'all'; // none - без повтора, one - повтор трека, all - повтор плейлиста
    shuffleMode: boolean; // перемешивание треков
    setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
    setCurrentTrack: React.Dispatch<React.SetStateAction<Track | null>>;
    setCurrentTrackIndex: React.Dispatch<React.SetStateAction<number>>;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    playTrack: (track: Track) => void;
    playTrackByIndex: (index: number) => void;
    pauseTrack: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    togglePlay: () => void;
    toggleRepeat: () => void; // Переключение режима повтора
    toggleShuffle: () => void; // Переключение режима перемешивания
    setVolume: (volume: number) => void; // Установка громкости
    getTrackCover: (coverUrl: string) => string; // Функция для получения обложки с обработкой ошибок
    addToQueue: (track: Track) => void; // Добавление трека в очередь
    removeTrackFromQueue: (trackId: number) => void; // Удаление трека из очереди
}

const PlayerContext = createContext<PlayerContextProps | undefined>(undefined);

// URL API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('[PlayerContext] Initializing PlayerContext');
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
    const [shuffleMode, setShuffleMode] = useState<boolean>(false);
    const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
    const [audio] = useState<HTMLAudioElement>(new Audio());

    // Обновляем аудио источник при изменении текущего трека
    useEffect(() => {
        if (currentTrack) {
            audio.src = currentTrack.audioUrl;
            
            if (isPlaying) {
                audio.play().catch(err => {
                    console.error('Ошибка воспроизведения:', err);
                });
            }
            
            // Увеличиваем счетчик прослушиваний
            if (currentTrack.id > 0) {
                try {
                    api.post(`/music/${currentTrack.id}/play`, {});
                } catch (err) {
                    console.error('Ошибка при обновлении счетчика прослушиваний:', err);
                }
            }
        }
    }, [currentTrack]);

    // Управление воспроизведением
    useEffect(() => {
        if (isPlaying) {
            audio.play().catch(err => {
                console.error('[PlayerContext] Ошибка воспроизведения:', err);
                setIsPlaying(false);
            });
        } else {
            audio.pause();
        }
    }, [isPlaying, audio]);

    // Добавим обработчики событий для аудио-элемента
    useEffect(() => {
        // Обработчик события timeupdate для отслеживания прогресса воспроизведения
        const handleTimeUpdate = () => {
            // Отключаем лишние логи для уменьшения шума в консоли
            // console.log('[PlayerContext] Время воспроизведения:', audio.currentTime);
        };

        const handleError = (e: Event) => {
            console.error('[PlayerContext] Ошибка аудио элемента:', e);
            if (audio.error) {
                console.error('[PlayerContext] Код ошибки:', audio.error.code, 'Сообщение:', audio.error.message);
            }
        };

        const handleAbort = () => {
            console.warn('[PlayerContext] Воспроизведение прервано');
        };

        const handleStalled = () => {
            console.warn('[PlayerContext] Воспроизведение приостановлено из-за буферизации');
        };

        const handlePlay = () => {
            console.log('[PlayerContext] Воспроизведение началось');
        };

        const handlePause = () => {
            console.log('[PlayerContext] Воспроизведение приостановлено');
        };

        const handleEnded = () => {
            console.log('[PlayerContext] Трек завершился (событие ended)');
        };

        // Добавляем обработчики
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('error', handleError);
        audio.addEventListener('abort', handleAbort);
        audio.addEventListener('stalled', handleStalled);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        
        // Удаляем обработчики при размонтировании
        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('abort', handleAbort);
            audio.removeEventListener('stalled', handleStalled);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audio]);

    // Переход к следующему треку по окончании текущего
    useEffect(() => {
        const handleEnded = () => {
            console.log('[PlayerContext] Трек закончился, проверка режима повтора:', repeatMode);
            if (repeatMode === 'one') {
                // Повтор текущего трека
                audio.currentTime = 0;
                audio.play().catch(err => {
                    console.error('[PlayerContext] Ошибка повторного воспроизведения:', err);
                });
            } else {
                // Переход к следующему треку или завершение воспроизведения
                console.log('[PlayerContext] Переход к следующему треку после окончания текущего');
                if (tracks.length > 0) {
                    let nextIndex;
                    if (shuffleMode) {
                        // Получаем следующий индекс в перемешанном массиве
                        const currentPos = shuffledIndices.indexOf(currentTrackIndex);
                        const nextPos = (currentPos + 1) % shuffledIndices.length;
                        nextIndex = shuffledIndices[nextPos];
                    } else {
                        // Обычное последовательное воспроизведение
                        nextIndex = (currentTrackIndex + 1) % tracks.length;
                    }
                    
                    // Всегда воспроизводим следующий трек
                    console.log(`[PlayerContext] Автопереход к треку: ${nextIndex}`);
                    setCurrentTrack(tracks[nextIndex]);
                    setCurrentTrackIndex(nextIndex);
                    setIsPlaying(true);
                }
            }
        };
        
        audio.addEventListener('ended', handleEnded);
        
        return () => {
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audio, repeatMode, shuffleMode, shuffledIndices, tracks, currentTrackIndex]);

    // Обновляем перемешанный список при изменении режима или треков
    useEffect(() => {
        if (shuffleMode && tracks.length > 0) {
            // Создаем массив индексов всех треков
            const indices = Array.from({length: tracks.length}, (_, i) => i);
            
            // Если есть текущий трек, ставим его на текущую позицию
            if (currentTrackIndex >= 0) {
                // Удаляем текущий трек из массива
                const currentPosition = indices.indexOf(currentTrackIndex);
                if (currentPosition > -1) {
                    indices.splice(currentPosition, 1);
                }
                
                // Перемешиваем оставшиеся индексы
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                
                // Вставляем текущий трек обратно на его оригинальную позицию
                indices.splice(currentTrackIndex, 0, currentTrackIndex);
            } else {
                // Если нет текущего трека, просто перемешиваем все
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
            }
            
            setShuffledIndices(indices);
            console.log('[PlayerContext] Перемешанная очередь:', indices);
        }
    }, [shuffleMode, tracks.length, currentTrackIndex]);

    // Загрузка треков при первом рендере
    useEffect(() => {
        const fetchTracks = async () => {
            try {
                const data = await api.get('/music');
                console.log('[PlayerContext] Loaded tracks:', data);
                
                if (!data || !Array.isArray(data) || data.length === 0) {
                    console.log('[PlayerContext] No tracks found');
                    return;
                }
                
                const validatedTracks = data.map((track: any) => {
                    return {
                        id: track.id || 0,
                        title: track.title || 'Неизвестный трек',
                        artist: track.artist || 'Неизвестный исполнитель',
                        duration: track.duration || '0:00',
                        coverUrl: track.coverUrl || DEFAULT_COVER_URL,
                        audioUrl: track.filename ? `${API_URL}/music/file/${track.filename}` : '',
                        playCount: track.playCount || 0
                    };
                });
                
                // Проверяем валидность всех обложек
                for (const track of validatedTracks) {
                    if (track.coverUrl !== DEFAULT_COVER_URL) {
                        // Проверяем основные параметры обложки
                        checkCoverOrientation(track.coverUrl).then(result => {
                            if (!result.isValid) {
                                console.warn(`[PlayerContext] Битая обложка у трека: ${track.title}`);
                                // Обновляем трек с дефолтной обложкой
                                setTracks(prev => 
                                    prev.map(t => 
                                        t.id === track.id ? { ...t, coverUrl: DEFAULT_COVER_URL } : t
                                    )
                                );

                                // Если это текущий трек, обновляем и его
                                if (currentTrack && currentTrack.id === track.id) {
                                    setCurrentTrack({...currentTrack, coverUrl: DEFAULT_COVER_URL});
                                }
                            } else if (!result.isSquare) {
                                console.warn(`[PlayerContext] Обложка не квадратная: ${track.title}, соотношение: ${result.aspectRatio.toFixed(2)}`);
                                // Мы можем решить сохранить некорректную обложку, но предупредим об этом
                            }
                        });
                    }
                }
                
                setTracks(validatedTracks);
                
                // Автоматически устанавливаем первый трек
                if (validatedTracks.length > 0 && !currentTrack) {
                    console.log('[PlayerContext] Setting initial track:', validatedTracks[0]);
                    setCurrentTrack(validatedTracks[0]);
                    setCurrentTrackIndex(0);
                }
            } catch (err) {
                console.error('[PlayerContext] Error loading tracks:', err);
            }
        };
        
        fetchTracks();
    }, []);

    const playTrack = (track: Track) => {
        console.log('[PlayerContext] Запрос на воспроизведение трека:', track.title);
        
        // Проверяем, есть ли трек в очереди
        const trackIndex = tracks.findIndex(t => t.id === track.id);
        
        if (trackIndex === -1) {
            // Если трека нет в очереди, добавляем его
            console.log('[PlayerContext] Трек не найден в очереди, добавляем:', track.title);
            const newTracks = [...tracks, track];
            setTracks(newTracks);
            setCurrentTrack(track);
            setCurrentTrackIndex(newTracks.length - 1);
        } else {
            // Если трек уже есть в очереди, просто воспроизводим его
            setCurrentTrack(track);
            setCurrentTrackIndex(trackIndex);
        }
        
        setIsPlaying(true);
    };

    const playTrackByIndex = (index: number) => {
        if (index >= 0 && index < tracks.length) {
            setCurrentTrack(tracks[index]);
            setCurrentTrackIndex(index);
            setIsPlaying(true);
        }
    };

    const pauseTrack = () => {
        setIsPlaying(false);
    };

    const nextTrack = () => {
        if (tracks.length === 0) return;
        
        let nextIndex;
        
        if (shuffleMode) {
            // Получаем следующий индекс в перемешанном массиве
            const currentPos = shuffledIndices.indexOf(currentTrackIndex);
            const nextPos = (currentPos + 1) % shuffledIndices.length;
            nextIndex = shuffledIndices[nextPos];
        } else {
            // Обычное последовательное воспроизведение
            nextIndex = (currentTrackIndex + 1) % tracks.length;
        }
        
        // Всегда воспроизводим следующий трек независимо от условий
        console.log(`[PlayerContext] Переход к следующему треку: ${nextIndex}`);
        setCurrentTrack(tracks[nextIndex]);
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
    };

    const prevTrack = () => {
        if (tracks.length === 0) return;
        
        let prevIndex;
        
        if (shuffleMode) {
            // Получаем предыдущий индекс в перемешанном массиве
            const currentPos = shuffledIndices.indexOf(currentTrackIndex);
            const prevPos = (currentPos - 1 + shuffledIndices.length) % shuffledIndices.length;
            prevIndex = shuffledIndices[prevPos];
        } else {
            // Обычное последовательное воспроизведение в обратном порядке
            prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
        }
        
        setCurrentTrack(tracks[prevIndex]);
        setCurrentTrackIndex(prevIndex);
        setIsPlaying(true);
    };

    const togglePlay = () => {
        if (currentTrack) {
            setIsPlaying(!isPlaying);
        } else if (tracks.length > 0) {
            // Если нет текущего трека, но есть треки в списке, запускаем первый
            setCurrentTrack(tracks[0]);
            setCurrentTrackIndex(0);
            setIsPlaying(true);
        }
    };

    // Новые функции управления
    const toggleRepeat = () => {
        setRepeatMode(current => {
            if (current === 'none') return 'one';
            if (current === 'one') return 'all';
            return 'none';
        });
    };

    const toggleShuffle = () => {
        setShuffleMode(current => !current);
    };

    const setVolume = (volume: number) => {
        audio.volume = Math.max(0, Math.min(1, volume));
    };

    // Функция для проверки валидности URL обложки
    const preloadCover = (url: string): Promise<boolean> => {
        return new Promise((resolve) => {
            if (!url || url === DEFAULT_COVER_URL) {
                resolve(false);
                return;
            }
            
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    };

    // Проверяет валидность URL обложки
    const getTrackCover = (coverUrl: string): string => {
        if (!coverUrl || coverUrl === 'undefined' || coverUrl === 'null') {
            console.warn('[PlayerContext] Пустой URL обложки, использую дефолтную');
            return DEFAULT_COVER_URL;
        }
        
        if (!coverUrl.startsWith('http') && !coverUrl.startsWith('/')) {
            console.warn('[PlayerContext] Некорректный URL обложки:', coverUrl);
            return DEFAULT_COVER_URL;
        }
        
        return coverUrl;
    };

    // Проверяет ориентацию и соотношение сторон обложки
    const checkCoverOrientation = (coverUrl: string): Promise<{
        isValid: boolean;
        isSquare: boolean;
        aspectRatio: number;
        width: number;
        height: number;
    }> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const width = img.naturalWidth;
                const height = img.naturalHeight;
                const aspectRatio = width / height;
                const isSquare = Math.abs(aspectRatio - 1) < 0.1; // Допускается небольшое отклонение
                
                console.log(`[PlayerContext] Обложка проверена: ${width}x${height}, соотношение: ${aspectRatio.toFixed(2)}`);
                
                resolve({
                    isValid: true,
                    isSquare,
                    aspectRatio,
                    width,
                    height
                });
            };
            img.onerror = () => {
                console.warn('[PlayerContext] Не удалось загрузить обложку для проверки:', coverUrl);
                resolve({
                    isValid: false,
                    isSquare: false,
                    aspectRatio: 0,
                    width: 0,
                    height: 0
                });
            };
            img.src = getTrackCover(coverUrl);
        });
    };

    // При установке текущего трека, проверяем обложку
    useEffect(() => {
        if (currentTrack) {
            // Проверяем доступность обложки, если она есть
            if (currentTrack.coverUrl && currentTrack.coverUrl !== DEFAULT_COVER_URL) {
                const img = new Image();
                img.onload = () => {
                    // Обложка загружена успешно, ничего не делаем
                };
                img.onerror = () => {
                    // Обложка не загружена, используем плейсхолдер
                    console.warn(`[PlayerContext] Не удалось загрузить обложку: ${currentTrack.coverUrl}`);
                    setCurrentTrack(prev => {
                        if (prev) {
                            return { ...prev, coverUrl: DEFAULT_COVER_URL };
                        }
                        return prev;
                    });
                };
                img.src = currentTrack.coverUrl;
            }
        }
    }, [currentTrack?.id]);

    // Функция для добавления трека в очередь
    const addToQueue = (track: Track) => {
        // Проверка, есть ли такой трек уже в очереди
        const trackExists = tracks.some(t => t.id === track.id);
        
        if (!trackExists) {
            console.log('[PlayerContext] Добавление трека в очередь:', track.title, track.artist);
            setTracks(prevTracks => [...prevTracks, track]);
            
            // Если очередь была пустой, устанавливаем текущий трек
            if (tracks.length === 0 && !currentTrack) {
                setCurrentTrack(track);
                setCurrentTrackIndex(0);
            }
        } else {
            console.log('[PlayerContext] Трек уже есть в очереди:', track.title, track.artist);
        }
    };

    // Функция для удаления трека из очереди
    const removeTrackFromQueue = (trackId: number) => {
        // Находим индекс трека в массиве
        const indexToRemove = tracks.findIndex(t => t.id === trackId);
        
        if (indexToRemove === -1) {
            console.log('[PlayerContext] Трек для удаления не найден:', trackId);
            return;
        }
        
        console.log('[PlayerContext] Удаление трека из очереди:', tracks[indexToRemove].title);
        
        // Проверяем, удаляем ли мы текущий трек
        const isRemovingCurrentTrack = currentTrackIndex === indexToRemove;
        
        // Создаем новый массив треков без удаляемого
        const updatedTracks = tracks.filter((_, index) => index !== indexToRemove);
        setTracks(updatedTracks);
        
        // Если удаляем текущий трек
        if (isRemovingCurrentTrack) {
            if (updatedTracks.length === 0) {
                // Если больше треков нет, сбрасываем текущий трек
                setCurrentTrack(null);
                setCurrentTrackIndex(-1);
                setIsPlaying(false);
            } else {
                // Если есть другие треки, воспроизводим следующий
                // Используем тот же индекс, потому что трек был удален и все сдвинулось
                const nextIndex = Math.min(indexToRemove, updatedTracks.length - 1);
                setCurrentTrack(updatedTracks[nextIndex]);
                setCurrentTrackIndex(nextIndex);
            }
        } else {
            // Если удаляем трек, который шел перед текущим, корректируем индекс
            if (indexToRemove < currentTrackIndex) {
                setCurrentTrackIndex(currentTrackIndex - 1);
            }
        }
    };

    return (
        <PlayerContext.Provider
            value={{
                tracks,
                currentTrack,
                currentTrackIndex,
                isPlaying,
                audio,
                repeatMode,
                shuffleMode,
                setTracks,
                setCurrentTrack,
                setCurrentTrackIndex,
                setIsPlaying,
                playTrack,
                playTrackByIndex,
                pauseTrack,
                nextTrack,
                prevTrack,
                togglePlay,
                toggleRepeat,
                toggleShuffle,
                setVolume,
                getTrackCover,
                addToQueue,
                removeTrackFromQueue
            }}
        >
            {children}
        </PlayerContext.Provider>
    );
};

export const usePlayer = (): PlayerContextProps => {
    const context = useContext(PlayerContext);
    if (context === undefined) {
        throw new Error('usePlayer должен использоваться внутри PlayerProvider');
    }
    return context;
}; 