import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Track } from '../types/music.types';
import { api } from '../utils/api';
import { BroadcastChannelManager } from '../utils/BroadcastChannelManager';

// Добавляем константу для плейсхолдера обложки
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

// Константа для имени канала обмена сообщениями
const PLAYER_SYNC_CHANNEL = 'player_sync_channel';
// Константа для имени хранилища активного плеера
const ACTIVE_PLAYER_STORAGE_KEY = 'active_player_instance';
// Константа для имени хранилища сессии плеера
const PLAYER_SESSION_KEY = 'player_session';

// Типы сообщений для синхронизации плеера
type PlayerSyncMessage = {
    type: 'PLAY_TRACK' | 'PAUSE_TRACK' | 'NEXT_TRACK' | 'PREV_TRACK' | 
          'SET_VOLUME' | 'UPDATE_QUEUE' | 'UPDATE_STATE' | 'SEEK_TO' | 
          'SET_REPEAT_MODE' | 'SET_SHUFFLE_MODE' | 'BECOME_MASTER' | 'MASTER_HEARTBEAT';
    data?: any;
    source?: string;
    timestamp?: number;
};

// Структура сессии плеера
interface PlayerSession {
    currentTrackIndex: number;
    isPlaying: boolean;
    repeatMode: 'none' | 'one' | 'all';
    shuffleMode: boolean;
    volume: number;
    currentTime?: number;
    lastUpdate: number;
}

export interface PlayerContextProps {
    tracks: Track[];
    currentTrack: Track | null;
    currentTrackIndex: number;
    isPlaying: boolean;
    audio: HTMLAudioElement;
    repeatMode: 'none' | 'one' | 'all'; // none - без повтора, one - повтор трека, all - повтор плейлиста
    shuffleMode: boolean; // перемешивание треков
    isMasterPlayer: boolean; // является ли данный плеер активным источником звука
    isPlayerWindowOpen: boolean; // Добавляем флаг открытия окна плеера
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
    seekTo: (time: number) => void; // Перемотка к указанному времени
    instanceId: string; // Уникальный ID экземпляра плеера для идентификации сообщений
    becomeMasterPlayer: () => boolean; // Стать главным плеером (источником звука)
}

const PlayerContext = createContext<PlayerContextProps | undefined>(undefined);

// URL API
const API_URL = process.env.REACT_APP_API_URL || 'https://rich-socks-dance.loca.lt/api';

// Глобальная переменная для хранения состояния проигрывания
interface PlayerState {
    position: number;
    isPlaying: boolean;
    trackId: string;
    timestamp: number;
}

let playerState: PlayerState = {
    position: 0,
    isPlaying: false,
    trackId: '',
    timestamp: 0
};

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    //console.log('[PlayerContext] Initializing PlayerContext');
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
    const [shuffleMode, setShuffleMode] = useState<boolean>(false);
    const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
    const [audio] = useState<HTMLAudioElement>(new Audio());
    const [isMasterPlayer, setIsMasterPlayer] = useState<boolean>(false);
    const lastHeartbeatRef = useRef<number>(0);
    const [instanceId] = useState<string>(() => 'player_' + Math.random().toString(36).substring(2, 9));
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    
    // Используем ref для BroadcastChannelManager
    const channelManagerRef = useRef<BroadcastChannelManager | null>(null);
    
    // Добавляем состояние для отслеживания открытия плеера в отдельном окне
    const [isPlayerWindowOpen, setIsPlayerWindowOpen] = useState<boolean>(false);
    
    // Инициализация менеджера каналов
    useEffect(() => {
        // Создаем менеджер каналов, если его еще нет
        if (!channelManagerRef.current) {
            channelManagerRef.current = new BroadcastChannelManager(PLAYER_SYNC_CHANNEL);
            
            // Инициализируем канал с обработчиком сообщений
            channelManagerRef.current.init((event: MessageEvent) => {
                try {
                    const message = event.data as PlayerSyncMessage;
                    
                    // Игнорируем собственные сообщения
                    if (message.source === instanceId) return;
                    
                    //console.log('[PlayerSync] Получено сообщение:', message);
                    
                    // Обработка различных типов сообщений
                    handleChannelMessage(message);
                } catch (err) {
                    console.error('[PlayerSync] Ошибка при обработке сообщения:', err);
                }
            });
            
            // Отправляем начальное сообщение с небольшой задержкой
            setTimeout(() => {
                sendSyncMessage({
                    type: 'UPDATE_STATE',
                    data: null
                });
                setIsInitialized(true);
            }, 300);
        }
        
        // Очистка при размонтировании
        return () => {
            if (channelManagerRef.current) {
                channelManagerRef.current.disconnect();
                channelManagerRef.current = null;
            }
        };
    }, [instanceId]);
    
    // Функция для обработки сообщений
    const handleChannelMessage = (message: PlayerSyncMessage) => {
        // Игнорируем наши собственные сообщения
        if (message.source === instanceId) {
            return;
        }

        try {
            // Обрабатываем разные типы сообщений
            switch (message.type) {
                case 'PLAY_TRACK':
                    // Проверяем, содержит ли сообщение информацию о треке
                    if (message.data && message.data.track) {
                        // Обновляем текущий трек и состояние воспроизведения
                        const receivedTrack = message.data.track;
                        
                        // Если трек уже есть в нашем списке, используем локальный экземпляр
                        // для предотвращения несовместимости объектов
                        let localTrack = tracks.find(t => t.id === receivedTrack.id);
                        
                        // Если трека нет в списке, добавляем его
                        if (!localTrack) {
                            localTrack = receivedTrack;
                            setTracks(prevTracks => [...prevTracks, receivedTrack]);
                        }
                        
                        // Обновляем индекс, если он был передан
                        let trackIndex = message.data.index;
                        if (trackIndex === undefined) {
                            trackIndex = tracks.findIndex(t => t.id === receivedTrack.id);
                            // Если трек не найден, используем конец списка
                            if (trackIndex === -1) {
                                trackIndex = tracks.length;
                            }
                        }
                        
                        // Проверяем, меняется ли трек или это просто возобновление воспроизведения
                        const isResuming = currentTrack && currentTrack.id === receivedTrack.id;
                        
                        // Обновляем текущий трек и его индекс
                        setCurrentTrack(localTrack as Track);
                        setCurrentTrackIndex(trackIndex);
                        
                        // Начинаем воспроизведение, если мы мастер-плеер
                        if (isMasterPlayer) {
                            setIsPlaying(true);
                            
                            // Если это возобновление и есть сохраненная позиция, используем её
                            if (isResuming && message.data.position !== undefined) {
                                audio.currentTime = message.data.position;
                            } else if (!isResuming) {
                                // Если это новый трек, начинаем с начала
                                audio.currentTime = 0;
                            }
                            
                            audio.play().catch(err => {
                                // Тихо обрабатываем ошибку воспроизведения
                            });
                        } else {
                            // Если мы не мастер-плеер, просто обновляем состояние
                            setIsPlaying(true);
                        }
                    }
                    break;
                    
                case 'PAUSE_TRACK':
                    // Ставим воспроизведение на паузу
                    setIsPlaying(false);
                    if (isMasterPlayer) {
                        // Сохраняем текущую позицию, если она передана
                        if (message.data && message.data.position !== undefined) {
                            audio.currentTime = message.data.position;
                        }
                        audio.pause();
                    }
                    break;
                    
                case 'NEXT_TRACK':
                    // Если передан индекс следующего трека, используем его
                    if (message.data && message.data.index !== undefined) {
                        const nextIndex = message.data.index;
                        if (nextIndex >= 0 && nextIndex < tracks.length) {
                            setCurrentTrack(tracks[nextIndex]);
                            setCurrentTrackIndex(nextIndex);
                            setIsPlaying(true);
                            
                            if (isMasterPlayer) {
                                audio.currentTime = 0;
                                audio.play().catch(() => {});
                            }
                        }
                    } else {
                        // Иначе вычисляем следующий трек на основе текущего
                        const nextIndex = (currentTrackIndex + 1) % tracks.length;
                        setCurrentTrack(tracks[nextIndex]);
                        setCurrentTrackIndex(nextIndex);
                        setIsPlaying(true);
                        
                        if (isMasterPlayer) {
                            audio.currentTime = 0;
                            audio.play().catch(() => {});
                        }
                    }
                    break;
                    
                case 'PREV_TRACK':
                    // Если передан индекс предыдущего трека, используем его
                    if (message.data && message.data.index !== undefined) {
                        const prevIndex = message.data.index;
                        if (prevIndex >= 0 && prevIndex < tracks.length) {
                            setCurrentTrack(tracks[prevIndex]);
                            setCurrentTrackIndex(prevIndex);
                            setIsPlaying(true);
                            
                            if (isMasterPlayer) {
                                audio.currentTime = 0;
                                audio.play().catch(() => {});
                            }
                        }
                    } else {
                        // Иначе вычисляем предыдущий трек на основе текущего
                        const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
                        setCurrentTrack(tracks[prevIndex]);
                        setCurrentTrackIndex(prevIndex);
                        setIsPlaying(true);
                        
                        if (isMasterPlayer) {
                            audio.currentTime = 0;
                            audio.play().catch(() => {});
                        }
                    }
                    break;
                case 'SET_VOLUME':
                    if (message.data?.volume !== undefined) {
                        audio.volume = message.data.volume;
                    }
                    break;
                case 'UPDATE_QUEUE':
                    if (message.data?.tracks) {
                        setTracks(message.data.tracks);
                    }
                    break;
                case 'SEEK_TO':
                    if (message.data?.time !== undefined) {
                        audio.currentTime = message.data.time;
                    }
                    break;
                case 'SET_REPEAT_MODE':
                    if (message.data?.repeatMode) {
                        setRepeatMode(message.data.repeatMode);
                    }
                    break;
                case 'SET_SHUFFLE_MODE':
                    if (message.data?.shuffleMode !== undefined) {
                        setShuffleMode(message.data.shuffleMode);
                    }
                    break;
                default:
                    // Убрали предупреждение о неизвестном типе сообщения
            }
        } catch (err) {
            console.error('[PlayerSync] Ошибка при обработке сообщения:', err);
        }
    };
    
    // Функция для отправки сообщения синхронизации
    const sendSyncMessage = useCallback((message: PlayerSyncMessage) => {
        if (channelManagerRef.current) {
            // Добавляем идентификатор источника и timestamp
            message.source = instanceId;
            message.timestamp = Date.now();
            // Убрали логирование сообщений
            channelManagerRef.current.postMessage(message);
        }
    }, [instanceId]);

    // Функция для обновления heartbeat текущего мастера - объявляем с useRef чтобы избежать цикличных зависимостей
    const updateMasterHeartbeatRef = useRef<(() => void) | null>(null);
    updateMasterHeartbeatRef.current = () => {
        if (isMasterPlayer) {
            const currentTime = Date.now();
            localStorage.setItem(
                ACTIVE_PLAYER_STORAGE_KEY, 
                JSON.stringify({ id: instanceId, timestamp: currentTime })
            );
            lastHeartbeatRef.current = currentTime;
            
            // Отправляем heartbeat другим плеерам
            if (channelManagerRef.current) {
                // Используем прямую отправку без setState
                const message: PlayerSyncMessage = {
                    type: 'MASTER_HEARTBEAT',
                    source: instanceId,
                    timestamp: currentTime
                };
                channelManagerRef.current.postMessage(message);
            }
            
            // Планируем следующий heartbeat напрямую через setTimeout без setState
            if (masterHeartbeatTimeoutRef.current) {
                clearTimeout(masterHeartbeatTimeoutRef.current);
            }
            
            const timeoutId = setTimeout(() => {
                if (updateMasterHeartbeatRef.current) {
                    updateMasterHeartbeatRef.current();
                }
            }, 2000);
            
            // Используем ref вместо setState для хранения таймера
            masterHeartbeatTimeoutRef.current = timeoutId;
        }
    };

    // Новый ref для хранения таймера heartbeat
    const masterHeartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Обновляем функцию becomeMasterPlayer для учета сессии
    const becomeMasterPlayer = useCallback(() => {
        const currentTime = Date.now();
        localStorage.setItem(
            ACTIVE_PLAYER_STORAGE_KEY, 
            JSON.stringify({ id: instanceId, timestamp: currentTime })
        );
        
        // Устанавливаем флаг мастер-плеера
        setIsMasterPlayer(true);
        
        // Непосредственно изменяем состояние аудио
        if (audio) {
            audio.muted = false;
            
            // Восстанавливаем сохраненную позицию из сессии
            try {
                const sessionData = localStorage.getItem(PLAYER_SESSION_KEY);
                if (sessionData) {
                    const session: PlayerSession = JSON.parse(sessionData);
                    if (session.currentTime !== undefined && currentTrack) {
                        audio.currentTime = session.currentTime;
                    }
                }
            } catch (e) {
                // Игнорируем ошибки при загрузке сессии
            }
        }
        
        // Обновляем последний heartbeat
        lastHeartbeatRef.current = currentTime;
        
        // Оповещаем всех о новом мастере
        sendSyncMessage({
            type: 'BECOME_MASTER',
            source: instanceId,
            timestamp: currentTime,
            data: {
                currentTrackIndex,
                isPlaying
            }
        });
        
        // Запускаем heartbeat
        if (updateMasterHeartbeatRef.current) {
            updateMasterHeartbeatRef.current();
        }
        
        // Возвращаем true, чтобы обозначить успешное становление мастером
        return true;
    }, [instanceId, audio, sendSyncMessage, isPlaying, currentTrackIndex, currentTrack]);

    // Функция для сохранения текущей сессии воспроизведения
    const savePlayerSession = useCallback(() => {
        const session: PlayerSession = {
            currentTrackIndex,
            isPlaying,
            repeatMode,
            shuffleMode,
            volume: audio.volume,
            currentTime: audio.currentTime,
            lastUpdate: Date.now()
        };
        localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
    }, [currentTrackIndex, isPlaying, repeatMode, shuffleMode, audio]);

    // Функция для загрузки сессии воспроизведения
    const loadPlayerSession = useCallback(() => {
        try {
            const sessionData = localStorage.getItem(PLAYER_SESSION_KEY);
            if (!sessionData) return false;
            
            const session: PlayerSession = JSON.parse(sessionData);
            
            // Проверяем, что есть треки для воспроизведения
            if (tracks.length > 0 && session.currentTrackIndex >= 0 && 
                session.currentTrackIndex < tracks.length) {
                
                // Обновляем состояние плеера из сессии
                setCurrentTrackIndex(session.currentTrackIndex);
                setCurrentTrack(tracks[session.currentTrackIndex]);
                setIsPlaying(session.isPlaying);
                setRepeatMode(session.repeatMode);
                setShuffleMode(session.shuffleMode);
                
                // Обновляем громкость
                if (session.volume !== undefined) {
                    audio.volume = session.volume;
                }
                
                // Обновляем позицию воспроизведения
                if (session.currentTime !== undefined && isMasterPlayer) {
                    audio.currentTime = session.currentTime;
                }
                
                return true;
            }
        } catch (e) {
            console.error('Ошибка при загрузке сессии плеера:', e);
        }
        return false;
    }, [tracks, audio, isMasterPlayer]);

    // Сохраняем сессию при изменении важных параметров
    useEffect(() => {
        if (isInitialized && currentTrack) {
            savePlayerSession();
        }
    }, [isInitialized, currentTrack, currentTrackIndex, isPlaying, repeatMode, shuffleMode, savePlayerSession]);

    // Сохраняем текущую позицию воспроизведения периодически для мастер-плеера
    useEffect(() => {
        if (!isMasterPlayer || !isPlaying) return;
        
        const saveTimeInterval = setInterval(() => {
            if (audio && !audio.paused && !audio.ended) {
                const session: PlayerSession = {
                    currentTrackIndex,
                    isPlaying,
                    repeatMode,
                    shuffleMode,
                    volume: audio.volume,
                    currentTime: audio.currentTime,
                    lastUpdate: Date.now()
                };
                localStorage.setItem(PLAYER_SESSION_KEY, JSON.stringify(session));
            }
        }, 5000); // Сохраняем каждые 5 секунд
        
        return () => {
            clearInterval(saveTimeInterval);
        };
    }, [isMasterPlayer, isPlaying, currentTrackIndex, repeatMode, shuffleMode, audio]);

    // Пытаемся загрузить сессию при инициализации
    useEffect(() => {
        if (isInitialized && tracks.length > 0 && !currentTrack) {
            loadPlayerSession();
        }
    }, [isInitialized, tracks, currentTrack, loadPlayerSession]);

    // Обновляем аудио источник при изменении текущего трека
    useEffect(() => {
        if (currentTrack) {
            // Проверяем, изменился ли трек
            const isNewTrack = audio.src !== currentTrack.audioUrl;
            
            if (isNewTrack) {
                audio.src = currentTrack.audioUrl;
                
                if (isPlaying && isMasterPlayer) {
                    // Добавляем проверку на уже играющий аудио, чтобы избежать дублирования
                    if (audio.paused || audio.ended) {
                        audio.play().catch(err => {
                            console.error('Ошибка воспроизведения:', err);
                        });
                    }
                }
                
                // Увеличиваем счетчик прослушиваний только для нового трека
                if (currentTrack.id > 0) {
                    try {
                        api.post(`/music/${currentTrack.id}/play`, {});
                    } catch (err) {
                        console.error('Ошибка при обновлении счетчика прослушиваний:', err);
                    }
                }
            }
        }
    }, [currentTrack, isMasterPlayer, isPlaying]);

    // Переход к следующему треку по окончании текущего
    useEffect(() => {
        const handleEnded = () => {
            if (repeatMode === 'one') {
                // При повторении трека сохраняем текущую позицию
                const savedPosition = localStorage.getItem('player_position');
                if (savedPosition) {
                    audio.currentTime = parseFloat(savedPosition);
                } else {
                    audio.currentTime = 0;
                }
                audio.play().catch(e => {
                    // Без вывода ошибки воспроизведения
                });
            } else {
                // Переход к следующему треку или завершение воспроизведения
                if (shuffleMode) {
                    const nextIndex = Math.floor(Math.random() * tracks.length);
                    setCurrentTrack(tracks[nextIndex]);
                    setCurrentTrackIndex(nextIndex);
                } else {
                    const nextIndex = (currentTrackIndex + 1) % tracks.length;
                    setCurrentTrack(tracks[nextIndex]);
                    setCurrentTrackIndex(nextIndex);
                }
            }
        };

        if (audio) {
            audio.addEventListener('ended', handleEnded);
        }

        return () => {
            if (audio) {
                audio.removeEventListener('ended', handleEnded);
            }
        };
    }, [audio, currentTrackIndex, repeatMode, shuffleMode, tracks]);

    // Обновляем перемешанный список при изменении режима или треков
    useEffect(() => {
        if (shuffleMode && tracks.length > 0) {
            // Создаем массив индексов треков без текущего трека
            const indices = Array.from({length: tracks.length}, (_, i) => i)
                .filter(i => i !== currentTrackIndex);
            
            // Перемешиваем индексы (алгоритм Фишера-Йейтса)
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            
            // Если есть текущий трек, добавляем его в начало
            if (currentTrackIndex >= 0) {
                indices.unshift(currentTrackIndex);
            }
            
            // Создаем новую перемешанную очередь
            const shuffledQueue = indices.map(idx => tracks[idx]);
            
            // Сохраняем исходный порядок треков перед установкой нового
            if (!shuffledIndices.length) {
                setShuffledIndices(Array.from({length: tracks.length}, (_, i) => i));
            }
            
            // Устанавливаем новый порядок треков
            setTracks(shuffledQueue);
            
            // Обновляем индекс текущего трека в новой очереди
            if (currentTrack) {
                const newIndex = shuffledQueue.findIndex(t => t.id === currentTrack.id);
                if (newIndex !== -1) {
                    setCurrentTrackIndex(newIndex);
                }
            }
        } else if (!shuffleMode && shuffledIndices.length > 0 && tracks.length > 0) {
            // Восстанавливаем исходный порядок треков
            
            // Создаем упорядоченную очередь на основе сохраненных индексов
            const originalQueue = [...tracks].sort((a, b) => {
                const indexA = shuffledIndices.findIndex(i => tracks[i].id === a.id);
                const indexB = shuffledIndices.findIndex(i => tracks[i].id === b.id);
                return indexA - indexB;
            });
            
            // Устанавливаем исходный порядок треков
            setTracks(originalQueue);
            
            // Сбрасываем сохраненные индексы
            setShuffledIndices([]);
            
            // Обновляем индекс текущего трека
            if (currentTrack) {
                const newIndex = originalQueue.findIndex(t => t.id === currentTrack.id);
                if (newIndex !== -1) {
                    setCurrentTrackIndex(newIndex);
                }
            }
        }
    }, [shuffleMode, tracks.length]);

    // Загрузка треков при первом рендере
    useEffect(() => {
        const fetchTracks = async () => {
            try {
                const data = await api.get('/music');
                
                // Проверяем новую структуру данных
                const tracksData = data.tracks || data;
                
                if (!tracksData || !Array.isArray(tracksData) || tracksData.length === 0) {
                    console.log('[PlayerContext] No tracks found');
                    return;
                }
                
                const validatedTracks = tracksData.map((track: any) => {
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
                                // Используем функциональное обновление состояния вместо предыдущего значения
                                setTracks(currentTracks => 
                                    currentTracks.map(t => 
                                        t.id === track.id ? { ...t, coverUrl: DEFAULT_COVER_URL } : t
                                    )
                                );
                            }
                        }).catch(err => {
                            console.error(`[PlayerContext] Ошибка при проверке обложки: ${err.message}`);
                        });
                    }
                }
                
                setTracks(validatedTracks);
                
                // Устанавливаем первый трек, только если у нас еще нет текущего трека
                if (validatedTracks.length > 0 && !currentTrack) {
                    setCurrentTrack(validatedTracks[0]);
                    setCurrentTrackIndex(0);
                }
            } catch (error) {
                console.error('[PlayerContext] Ошибка при загрузке треков:', error);
            }
        };

        fetchTracks();
    }, []);

    // Добавляем прослушиватель для обнаружения открытия плеера в отдельном окне
    useEffect(() => {
        // Добавляем обработчик события хранилища для коммуникации между окнами
        const handleStorageEvent = (event: StorageEvent) => {
            if (event.key === 'player_window_opened') {
                setIsPlayerWindowOpen(true);
            } else if (event.key === 'player_window_closed') {
                setIsPlayerWindowOpen(false);
            }
        };

        window.addEventListener('storage', handleStorageEvent);

        // Проверяем, есть ли уже открытое окно плеера
        const checkPlayerWindowState = () => {
            const playerWindowTimestamp = localStorage.getItem('player_window_opened');
            const playerWindowClosed = localStorage.getItem('player_window_closed');
            
            // Проверяем наличие обоих значений
            if (playerWindowTimestamp && playerWindowClosed) {
                // Преобразуем строки в числа для корректного сравнения
                const openedTime = parseInt(playerWindowTimestamp);
                const closedTime = parseInt(playerWindowClosed);
                
                // Проверяем, что временная метка открытия новее, чем метка закрытия
                if (openedTime > closedTime) {
                    setIsPlayerWindowOpen(true);
                } else {
                    setIsPlayerWindowOpen(false);
                }
            } else if (playerWindowTimestamp && !playerWindowClosed) {
                // Есть только метка открытия - окно открыто
                setIsPlayerWindowOpen(true);
            } else {
                // Нет метки открытия или есть только метка закрытия - окно закрыто
                setIsPlayerWindowOpen(false);
            }
        };
        
        // Проверяем состояние при загрузке
        checkPlayerWindowState();
        
        // Установим интервал для периодической проверки состояния
        const checkInterval = setInterval(checkPlayerWindowState, 5000);

        return () => {
            window.removeEventListener('storage', handleStorageEvent);
            clearInterval(checkInterval);
        };
    }, []);

    // Модифицируем методы воспроизведения, чтобы учитывать открытие плеера в отдельном окне
    const playTrack = (track: Track) => {
        // Если трека нет в очереди, добавляем его
        const trackIndex = tracks.findIndex(t => t.id === track.id);
        let newTracks = [...tracks];
        let newIndex = trackIndex;
        
        if (trackIndex === -1) {
            // Добавляем трек в очередь
            newTracks = [...tracks, track];
            newIndex = newTracks.length - 1;
            setTracks(newTracks);
        }
        
        // Проверяем, воспроизводим ли тот же трек
        const isSameTrack = currentTrack && currentTrack.id === track.id;
        
        // Сохраняем текущую позицию, если это тот же трек
        const currentPosition = isSameTrack && audio ? audio.currentTime : 0;
        
        // Всегда обновляем текущий трек и индекс
        setCurrentTrack(track);
        setCurrentTrackIndex(newIndex);
        setIsPlaying(true);
        
        // Если не мастер-плеер, становимся им при начале воспроизведения
        if (!isMasterPlayer) {
            becomeMasterPlayer();
        }
        
        // Синхронизируем воспроизведение в любом случае
        sendSyncMessage({
            type: 'PLAY_TRACK',
            data: { 
                track,
                index: newIndex,
                position: isSameTrack ? currentPosition : undefined
            }
        });
    };

    const playTrackByIndex = (index: number) => {
        if (index >= 0 && index < tracks.length) {
            const track = tracks[index];
            setCurrentTrack(track);
            setCurrentTrackIndex(index);
            setIsPlaying(true);
            
            // Синхронизируем воспроизведение
            sendSyncMessage({
                type: 'PLAY_TRACK',
                data: { track, index }
            });
        }
    };

    const pauseTrack = () => {
        setIsPlaying(false);
        
        // Сохраняем текущую позицию трека
        const currentPosition = audio ? audio.currentTime : 0;
        
        // Синхронизируем паузу с сохраненной позицией
        sendSyncMessage({
            type: 'PAUSE_TRACK',
            data: { position: currentPosition }
        });
    };

    const nextTrack = () => {
        if (tracks.length === 0) return;
        
        const nextIndex = (currentTrackIndex + 1) % tracks.length;
        const nextTrack = tracks[nextIndex];
        
        // Если следующий трек тот же самый, сохраняем позицию
        if (nextTrack.id === currentTrack?.id) {
            const savedPosition = localStorage.getItem('player_position');
            if (savedPosition) {
                audio.currentTime = parseFloat(savedPosition);
            }
        } else {
            audio.currentTime = 0;
        }
        
        setCurrentTrack(nextTrack);
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
        
        if (isMasterPlayer) {
            audio.play().catch(() => {});
        }
    };

    const prevTrack = () => {
        if (tracks.length === 0) return;
        
        // Если воспроизведение трека было меньше 3 секунд, переходим к предыдущему треку
        // Иначе просто перематываем текущий трек в начало
        if (audio.currentTime > 3) {
            const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
            const prevTrack = tracks[prevIndex];
            
            // Если предыдущий трек тот же самый, сохраняем позицию
            if (prevTrack.id === currentTrack?.id) {
                const savedPosition = localStorage.getItem('player_position');
                if (savedPosition) {
                    audio.currentTime = parseFloat(savedPosition);
                }
            } else {
                audio.currentTime = 0;
            }
            
            setCurrentTrack(prevTrack);
            setCurrentTrackIndex(prevIndex);
        } else {
            // Если это тот же трек, сохраняем позицию
            const savedPosition = localStorage.getItem('player_position');
            if (savedPosition) {
                audio.currentTime = parseFloat(savedPosition);
            } else {
                audio.currentTime = 0;
            }
        }
        
        setIsPlaying(true);
        
        if (isMasterPlayer) {
            audio.play().catch(() => {});
        }
    };

    const toggleRepeat = () => {
        let newMode: 'none' | 'one' | 'all';
        
        switch (repeatMode) {
            case 'none':
                newMode = 'all';
                break;
            case 'all':
                newMode = 'one';
                break;
            case 'one':
            default:
                newMode = 'none';
                break;
        }
        
        setRepeatMode(newMode);
        
        // Синхронизируем режим повтора
        sendSyncMessage({
            type: 'SET_REPEAT_MODE',
            data: { repeatMode: newMode }
        });
    };

    const toggleShuffle = () => {
        const newShuffleMode = !shuffleMode;
        setShuffleMode(newShuffleMode);
        
        // Синхронизируем режим перемешивания
        sendSyncMessage({
            type: 'SET_SHUFFLE_MODE',
            data: { shuffleMode: newShuffleMode }
        });
    };

    const setVolume = (volume: number) => {
        if (audio) {
            audio.volume = volume;
            
            // Синхронизируем громкость
            sendSyncMessage({
                type: 'SET_VOLUME',
                data: { volume }
            });
        }
    };

    // Функция для перемотки к указанному времени
    const seekTo = (time: number) => {
        if (audio) {
            audio.currentTime = time;
            
            // Синхронизируем позицию
            sendSyncMessage({
                type: 'SEEK_TO',
                data: { time }
            });
        }
    };

    // Функция для получения URL обложки
    const getTrackCover = (coverUrl: string): string => {
        if (!coverUrl || coverUrl === '') {
            return DEFAULT_COVER_URL;
        }
        
        // Проверяем, содержит ли URL уже хост
        if (coverUrl.startsWith('http') || coverUrl.startsWith('/api/')) {
            return coverUrl;
        }
        
        // Если нет, добавляем полный путь к API
        return `/api/music/cover/${coverUrl}`;
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
                
                resolve({
                    isValid: true,
                    isSquare,
                    aspectRatio,
                    width,
                    height
                });
            };
            img.onerror = () => {
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
        if (currentTrack && currentTrack.coverUrl && currentTrack.coverUrl !== DEFAULT_COVER_URL) {
            const checkCover = () => {
                const img = new Image();
                img.onload = () => {
                    // Обложка загружена успешно, ничего не делаем
                };
                img.onerror = () => {
                    // Обложка не загружена, используем плейсхолдер
                    console.warn(`[PlayerContext] Не удалось загрузить обложку: ${currentTrack.coverUrl}`);
                    setCurrentTrack(prevTrack => {
                        if (prevTrack && prevTrack.id === currentTrack.id) {
                            return { ...prevTrack, coverUrl: DEFAULT_COVER_URL };
                        }
                        return prevTrack;
                    });
                };
                if (currentTrack.coverUrl.startsWith('http')) {
                    img.src = currentTrack.coverUrl;
                } else {
                    img.src = getTrackCover(currentTrack.coverUrl);
                }
            };
            
            checkCover();
        }
    }, [currentTrack?.id, currentTrack?.coverUrl, getTrackCover]);

    // Функция для добавления трека в очередь
    const addToQueue = (track: Track) => {
        // Проверка, есть ли такой трек уже в очереди
        const trackExists = tracks.some(t => t.id === track.id);
        
        if (!trackExists) {
            console.log('[PlayerContext] Добавление трека в очередь:', track.title, track.artist);
            const newTracks = [...tracks, track];
            setTracks(newTracks);
            
            // Если очередь была пустой, устанавливаем текущий трек
            if (tracks.length === 0 && !currentTrack) {
                setCurrentTrack(track);
                setCurrentTrackIndex(0);
            }
            
            // Синхронизируем очередь
            sendSyncMessage({
                type: 'UPDATE_QUEUE',
                data: { tracks: newTracks }
            });
        } else {
            console.log('[PlayerContext] Трек уже есть в очереди:', track.title, track.artist);
        }
    };

    // Функция для удаления трека из очереди
    const removeTrackFromQueue = (trackId: number) => {
        const indexToRemove = tracks.findIndex(t => t.id === trackId);
        if (indexToRemove === -1) return;
        
        const isRemovingCurrentTrack = currentTrack && currentTrack.id === trackId;
        const updatedTracks = tracks.filter(t => t.id !== trackId);
        
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
        
        // Синхронизируем очередь
        sendSyncMessage({
            type: 'UPDATE_QUEUE',
            data: { tracks: updatedTracks }
        });
    };

    // Улучшенная обработка синхронизации между окнами
    useEffect(() => {
        // Добавляем обработчик хранилища для проверки изменений связанных с отдельным окном плеера
        const handleStorage = (event: StorageEvent) => {
            if (event.key === 'player_window_closed_keep_playing' && event.newValue) {
                // Окно плеера было закрыто, но воспроизведение должно продолжаться
                // Становимся мастер-плеером, если не являемся им уже
                if (!isMasterPlayer) {
                    console.log('[PlayerContext] Окно плеера закрыто, становимся мастер-плеером');
                    becomeMasterPlayer();
                }
                
                // Продолжаем воспроизведение
                if (currentTrack && !isPlaying) {
                    setIsPlaying(true);
                }
                
                // Удаляем флаг
                localStorage.removeItem('player_window_closed_keep_playing');
            }
        };
        
        // Подписываемся на изменения хранилища
        window.addEventListener('storage', handleStorage);
        
        return () => {
            window.removeEventListener('storage', handleStorage);
        };
    }, [instanceId, becomeMasterPlayer, currentTrack, isPlaying, isMasterPlayer]);

    // Исправить useEffect для обработки синхронизации
    useEffect(() => {
        // Отправляем текущее состояние при загрузке для синхронизации с другими окнами
        if (channelManagerRef.current && isInitialized) {
            // Небольшая задержка для уверенности, что все окна загрузились
            setTimeout(() => {
                sendSyncMessage({
                    type: 'UPDATE_STATE',
                    data: {
                        isPlaying,
                        currentTrackIndex
                    }
                });
            }, 300);
        }
    }, [channelManagerRef, isInitialized, sendSyncMessage, isPlaying, currentTrackIndex]);

    // После определения функции loadPlayerSession
    // Проверяем наличие активного плеера при инициализации
    useEffect(() => {
        const checkActiveMaster = () => {
            const storedMaster = localStorage.getItem(ACTIVE_PLAYER_STORAGE_KEY);
            const currentTime = Date.now();
            
            if (!storedMaster) {
                // Если нет активного мастера, становимся им
                becomeMasterPlayer();
                return;
            }

            try {
                const masterData = JSON.parse(storedMaster);
                
                // Проверяем, не устарел ли мастер (5 секунд)
                if (currentTime - masterData.timestamp > 5000) {
                    // Мастер неактивен, становимся новым мастером
                    becomeMasterPlayer();
                } else if (masterData.id === instanceId) {
                    // Мы уже мастер, просто обновляем heartbeat без изменения состояния
                    // setIsMasterPlayer(true) - убираем лишнее изменение состояния
                    if (!isMasterPlayer) {
                        // Обновляем состояние только если оно действительно изменилось
                        setIsMasterPlayer(true);
                        audio.muted = false;
                    }
                    
                    if (updateMasterHeartbeatRef.current) {
                        updateMasterHeartbeatRef.current();
                    }
                } else {
                    // Есть активный мастер, и это не мы
                    if (isMasterPlayer) {
                        // Обновляем состояние только если оно действительно изменилось
                        setIsMasterPlayer(false);
                        // Явно выключаем свой звук
                        audio.muted = true;
                    } else if (!audio.muted) {
                        // Делаем прямое изменение, не трогая состояние React
                        audio.muted = true;
                    }
                }
            } catch (e) {
                // При ошибке парсинга пробуем стать мастером
                becomeMasterPlayer();
            }
        };

        // Проверяем статус мастера при первом рендере
        checkActiveMaster();
        
        // Устанавливаем периодическую проверку активности мастера
        const checkInterval = setInterval(checkActiveMaster, 3000);

        return () => {
            clearInterval(checkInterval);
            if (masterHeartbeatTimeoutRef.current) {
                clearTimeout(masterHeartbeatTimeoutRef.current);
                masterHeartbeatTimeoutRef.current = null;
            }
        };
    }, [instanceId, audio, becomeMasterPlayer, isMasterPlayer]);

    // Инициализация плеера с загрузкой сессии
    useEffect(() => {
        if (isInitialized && tracks.length > 0) {
            // Если нет текущего трека, пытаемся загрузить его из сессии
            if (!currentTrack) {
                const sessionLoaded = loadPlayerSession();
                
                // Если не удалось загрузить сессию, устанавливаем первый трек
                if (!sessionLoaded) {
                    setCurrentTrack(tracks[0]);
                    setCurrentTrackIndex(0);
                }
            } else {
                // Если трек уже установлен, но мы только что инициализировались,
                // проверяем нет ли более свежей сессии
                try {
                    const sessionData = localStorage.getItem(PLAYER_SESSION_KEY);
                    if (sessionData) {
                        const session: PlayerSession = JSON.parse(sessionData);
                        // Если текущая сессия отличается от нашего состояния и не слишком старая (не более 1 часа)
                        const isSessionRecent = Date.now() - session.lastUpdate < 60 * 60 * 1000;
                        if (isSessionRecent && 
                            (session.currentTrackIndex !== currentTrackIndex || 
                             session.isPlaying !== isPlaying)) {
                            loadPlayerSession();
                        }
                    }
                } catch (e) {
                    // Игнорируем ошибки при проверке сессии
                }
            }
        }
    }, [isInitialized, tracks.length, currentTrack, loadPlayerSession, currentTrackIndex, isPlaying]);

    // Управление воспроизведением
    const togglePlay = () => {
        if (!audio) return;

        try {
            if (isPlaying) {
                // При паузе сохраняем текущее состояние в глобальную переменную
                playerState = {
                    position: audio.currentTime,
                    isPlaying: false,
                    trackId: String(currentTrack?.id || ''),
                    timestamp: Date.now()
                };
                audio.pause();
                setIsPlaying(false);
            } else {
                // При воспроизведении восстанавливаем состояние из глобальной переменной
                if (playerState.trackId === String(currentTrack?.id || '')) {
                    audio.currentTime = playerState.position;
                }
                
                audio.play();
                setIsPlaying(true);
            }
        } catch (error) {
            console.error('Ошибка при переключении воспроизведения:', error);
            setIsPlaying(false);
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
                isMasterPlayer,
                isPlayerWindowOpen, // Добавляем флаг открытия окна плеера
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
                removeTrackFromQueue,
                seekTo,
                instanceId,
                becomeMasterPlayer
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