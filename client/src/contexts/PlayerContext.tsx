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
// Константа для хранения перемешанной очереди
const SHUFFLE_QUEUE_KEY = 'player_shuffle_queue';

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
    shuffledQueue: number[]; // Перемешанная очередь индексов треков
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
    setRepeatMode: React.Dispatch<React.SetStateAction<'none' | 'one' | 'all'>>; // Установка режима повтора
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
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

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

// В начале файла добавим расширение типа Window
declare global {
    interface Window {
        playerApi?: {
            playTrack: (track: Track) => void;
            togglePlay: () => void;
            nextTrack: () => void;
            prevTrack: () => void;
            setVolume: (volume: number) => void;
            becomeMasterPlayer: () => boolean;
        };
    }
}

// В начале файла после импортов добавим глобального слушателя всех аудио
// Создаем глобальный менеджер аудио для предотвращения дублирования
const audioManager = {
    // Хранение всех аудио элементов
    audioElements: new Set<HTMLAudioElement>(),
    
    // Регистрация аудио элемента
    register(audio: HTMLAudioElement) {
        this.audioElements.add(audio);
        console.log('[AudioManager] Зарегистрирован новый аудио элемент, всего:', this.audioElements.size);
    },
    
    // Удаление аудио элемента
    unregister(audio: HTMLAudioElement) {
        this.audioElements.delete(audio);
    },
    
    // Заглушить все аудио кроме указанного
    muteAllExcept(exceptAudio: HTMLAudioElement | null) {
        Array.from(this.audioElements).forEach(audio => {
            if (audio !== exceptAudio) {
                console.log('[AudioManager] Заглушаем аудио элемент');
                audio.muted = true;
                if (!audio.paused) {
                    audio.pause();
                }
            }
        });
    },
    
    // Заглушить все аудио
    muteAll() {
        Array.from(this.audioElements).forEach(audio => {
            console.log('[AudioManager] Заглушаем все аудио');
            audio.muted = true;
            if (!audio.paused) {
                audio.pause();
            }
        });
    }
};

export const PlayerProvider = ({ children }: { children: React.ReactNode }): React.ReactElement => {
    //console.log('[PlayerContext] Initializing PlayerContext');
    const [tracks, setTracks] = useState<Track[]>([]);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
    const [shuffleMode, setShuffleMode] = useState<boolean>(false);
    const [shuffledQueue, setShuffledQueue] = useState<number[]>([]);
    const [originalQueue, setOriginalQueue] = useState<Track[]>([]);
    const [shuffleUsedTracks, setShuffleUsedTracks] = useState<Set<number>>(new Set());
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
        if (message.source === instanceId) {
            return;
        }

        try {
            switch (message.type) {
                case 'PLAY_TRACK':
                    if (message.data && message.data.track) {
                        const receivedTrack = message.data.track as Track;
                        const isPlayerWindow = window.location.pathname.includes('/player');
                        
                        // Проверяем наличие трека в плейлисте и используем полученный трек как запасной вариант
                        const localTrack = tracks.find(t => t.id === receivedTrack.id) ?? receivedTrack;

                        // Если трек не в плейлисте, добавляем его
                        if (!tracks.some(t => t.id === localTrack.id)) {
                            setTracks(prevTracks => [...prevTracks, localTrack]);
                        }

                        // Обновляем состояние
                        setCurrentTrack(localTrack);
                        setIsPlaying(true);
                        setCurrentTrackIndex(message.data.index ?? tracks.length);

                        // Проверка состояния окна плеера
                        const playerWindowOpened = localStorage.getItem('player_window_opened');
                        const playerWindowClosed = localStorage.getItem('player_window_closed');
                        let isPlayerWindowActive = false;
                        
                        if (playerWindowOpened && playerWindowClosed) {
                            const openedTime = parseInt(playerWindowOpened);
                            const closedTime = parseInt(playerWindowClosed);
                            isPlayerWindowActive = openedTime > closedTime;
                        } else if (playerWindowOpened && !playerWindowClosed) {
                            isPlayerWindowActive = true;
                        }

                        // Строгая проверка: только окно плеера может воспроизводить звук
                        if (isPlayerWindow && isPlayerWindowActive) {
                            console.log('[PlayerContext] Воспроизведение трека в окне плеера:', localTrack.title);
                            
                            // Заглушаем все остальные аудио элементы
                            audioManager.muteAllExcept(audio);
                            
                            if (audio.src !== localTrack.audioUrl) {
                                audio.src = localTrack.audioUrl;
                            }
                            audio.muted = false;
                            audio.play().catch(err => {
                                console.error('Ошибка воспроизведения:', err);
                                setIsPlaying(false);
                            });
                        } else {
                            // Все остальные окна должны быть заглушены
                            console.log('[PlayerContext] Заглушение звука в других окнах');
                            audio.muted = true;
                            if (!audio.paused) {
                                audio.pause();
                            }
                        }
                    }
                    break;

                case 'PAUSE_TRACK':
                    setIsPlaying(false);
                    if (!audio.paused) {
                        audio.pause();
                    }
                    if (message.data && message.data.position !== undefined) {
                        audio.currentTime = message.data.position;
                    }
                    break;

                case 'SEEK_TO':
                    if (message.data && message.data.position !== undefined) {
                        audio.currentTime = message.data.position;
                    }
                    break;

                case 'BECOME_MASTER':
                    // Если мы были мастером, но получили сообщение о новом мастере,
                    // отключаем наш звук
                    if (isMasterPlayer) {
                        setIsMasterPlayer(false);
                        audio.muted = true;
                        if (!audio.paused) {
                            audio.pause();
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('Ошибка при обработке сообщения:', error);
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

    // Обновляем функцию becomeMasterPlayer для учета отдельного окна плеера
    const becomeMasterPlayer = useCallback(() => {
        // Если открыто окно плеера и мы не являемся этим окном, не становимся мастером
        const playerWindowTimestamp = localStorage.getItem('player_window_opened');
        const playerWindowClosed = localStorage.getItem('player_window_closed');
        let isPlayerWindowActive = false;
        
        if (playerWindowTimestamp && playerWindowClosed) {
            const openedTime = parseInt(playerWindowTimestamp);
            const closedTime = parseInt(playerWindowClosed);
            isPlayerWindowActive = openedTime > closedTime;
        } else if (playerWindowTimestamp && !playerWindowClosed) {
            isPlayerWindowActive = true;
        }
        
        if (isPlayerWindowActive && !window.location.pathname.includes('/player')) {
            return false;
        }
        
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

    // Обновляем перемешанный список при изменении режима или треков
    useEffect(() => {
        if (shuffleMode && tracks.length > 0) {
            // Если мы только что включили режим перемешивания или состав треков изменился
            if (originalQueue.length === 0 || 
                originalQueue.length !== tracks.length || 
                !originalQueue.every((track, i) => track.id === tracks[i].id)) {
                
                // Сохраняем оригинальную очередь треков
                setOriginalQueue([...tracks]);
                
                // Создаем массив индексов всех треков для перемешивания
                const indices = Array.from({length: tracks.length}, (_, i) => i);
                
                // Если есть текущий трек, удаляем его из перемешивания и добавим его отдельно
                if (currentTrackIndex >= 0) {
                    indices.splice(currentTrackIndex, 1);
                }
                
                // Перемешиваем индексы (алгоритм Фишера-Йейтса)
                for (let i = indices.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [indices[i], indices[j]] = [indices[j], indices[i]];
                }
                
                // Если есть текущий трек, добавляем его в начало перемешанной очереди
                if (currentTrackIndex >= 0) {
                    indices.unshift(currentTrackIndex);
                    
                    // Добавляем текущий трек в список уже использованных
                    setShuffleUsedTracks(new Set([currentTrackIndex]));
                } else {
                    // Сбрасываем список использованных треков
                    setShuffleUsedTracks(new Set());
                }
                
                // Сохраняем перемешанную очередь индексов
                setShuffledQueue(indices);
            }
        } else if (!shuffleMode) {
            // При выключении режима перемешивания, восстанавливаем исходную очередь
            if (originalQueue.length > 0) {
                // Находим текущий трек в оригинальной очереди, если он есть
                let originalIndex = -1;
                if (currentTrack) {
                    originalIndex = originalQueue.findIndex(t => t.id === currentTrack.id);
                }
                
                // Восстанавливаем исходную очередь
                setTracks([...originalQueue]);
                
                // Обновляем индекс текущего трека
                if (originalIndex !== -1) {
                    setCurrentTrackIndex(originalIndex);
                }
                
                // Очищаем сохраненные данные о перемешивании
                setOriginalQueue([]);
                setShuffledQueue([]);
                setShuffleUsedTracks(new Set());
            }
        }
    }, [shuffleMode, tracks.length, currentTrackIndex, currentTrack]);

    // Переход к следующему треку по окончании текущего
    useEffect(() => {
        const handleEnded = () => {
            if (repeatMode === 'one') {
                // При повторении трека всегда начинаем сначала
                audio.currentTime = 0;
                audio.play().catch(e => {
                    // Без вывода ошибки воспроизведения
                });
            } else {
                // Переход к следующему треку в зависимости от режима перемешивания
                if (shuffleMode) {
                    // Добавляем текущий трек в список использованных
                    if (currentTrackIndex >= 0) {
                        const newUsedTracks = new Set(shuffleUsedTracks);
                        newUsedTracks.add(currentTrackIndex);
                        setShuffleUsedTracks(newUsedTracks);
                    }
                    
                    // Подсчитываем количество неиспользованных треков
                    const unusedTracks = tracks.length - shuffleUsedTracks.size;
                    
                    // Если все треки были использованы и включён повтор, сбрасываем счётчик
                    if (unusedTracks === 0 && repeatMode === 'all') {
                        // Сбрасываем список использованных треков, но оставляем текущий
                        setShuffleUsedTracks(new Set([currentTrackIndex]));
                        
                        // Перемешиваем очередь заново, исключая текущий трек
                        const indices = Array.from({length: tracks.length}, (_, i) => i)
                            .filter(i => i !== currentTrackIndex);
                        
                        // Перемешиваем индексы
                        for (let i = indices.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [indices[i], indices[j]] = [indices[j], indices[i]];
                        }
                        
                        // Выбираем первый трек из новой перемешанной очереди
                        const nextTrackIndex = indices[0];
                        setCurrentTrack(tracks[nextTrackIndex]);
                        setCurrentTrackIndex(nextTrackIndex);
                        
                        // Обновляем перемешанную очередь
                        indices.shift(); // Удаляем выбранный трек
                        setShuffledQueue([nextTrackIndex, ...indices]);
                    } 
                    // Если остались неиспользованные треки, выбираем следующий из очереди
                    else if (unusedTracks > 0 || repeatMode === 'all') {
                        // Находим индекс текущего трека в перемешанной очереди
                        const currentQueueIndex = shuffledQueue.indexOf(currentTrackIndex);
                        
                        if (currentQueueIndex !== -1 && currentQueueIndex < shuffledQueue.length - 1) {
                            // Если текущий трек не последний в очереди, берем следующий
                            const nextTrackIndex = shuffledQueue[currentQueueIndex + 1];
                            setCurrentTrack(tracks[nextTrackIndex]);
                            setCurrentTrackIndex(nextTrackIndex);
                        } else {
                            // Если текущий трек последний в очереди, но есть неиспользованные треки
                            // Перемешиваем оставшиеся неиспользованные треки
                            const unusedIndices = Array.from({length: tracks.length}, (_, i) => i)
                                .filter(i => !shuffleUsedTracks.has(i));
                            
                            if (unusedIndices.length > 0) {
                                // Перемешиваем неиспользованные индексы
                                for (let i = unusedIndices.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [unusedIndices[i], unusedIndices[j]] = [unusedIndices[j], unusedIndices[i]];
                                }
                                
                                // Выбираем первый трек из новых неиспользованных
                                const nextTrackIndex = unusedIndices[0];
                                setCurrentTrack(tracks[nextTrackIndex]);
                                setCurrentTrackIndex(nextTrackIndex);
                            } else if (repeatMode === 'all') {
                                // Если все треки были использованы и включён повтор, начинаем сначала
                                // Сбрасываем список использованных треков
                                setShuffleUsedTracks(new Set());
                                
                                // Перемешиваем очередь заново
                                const indices = Array.from({length: tracks.length}, (_, i) => i);
                                
                                // Перемешиваем индексы
                                for (let i = indices.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [indices[i], indices[j]] = [indices[j], indices[i]];
                                }
                                
                                // Выбираем первый трек из новой перемешанной очереди
                                const nextTrackIndex = indices[0];
                                setCurrentTrack(tracks[nextTrackIndex]);
                                setCurrentTrackIndex(nextTrackIndex);
                                
                                // Обновляем перемешанную очередь
                                indices.shift(); // Удаляем выбранный трек
                                setShuffledQueue([nextTrackIndex, ...indices]);
                                
                                // Добавляем новый трек в список использованных
                                setShuffleUsedTracks(new Set([nextTrackIndex]));
                            }
                        }
                    }
                    // Если треки закончились и повтор выключен, останавливаем воспроизведение
                    else {
                        setIsPlaying(false);
                        if (isMasterPlayer) {
                            audio.pause();
                            audio.currentTime = 0;
                        }
                    }
                } else {
                    // В обычном режиме просто берем следующий трек по порядку
                    const nextIndex = (currentTrackIndex + 1) % tracks.length;
                    // Если дошли до конца и повтор выключен, останавливаем воспроизведение
                    if (nextIndex === 0 && repeatMode === 'none') {
                        setIsPlaying(false);
                        if (isMasterPlayer) {
                            audio.pause();
                            audio.currentTime = 0;
                        }
                    } else {
                        setCurrentTrack(tracks[nextIndex]);
                        setCurrentTrackIndex(nextIndex);
                    }
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
    }, [
        audio, 
        currentTrackIndex, 
        repeatMode, 
        shuffleMode, 
        tracks, 
        shuffledQueue, 
        shuffleUsedTracks, 
        isMasterPlayer,
        currentTrack
    ]);

    // Загрузка треков при первом рендере
    useEffect(() => {
        const fetchTracks = async () => {
            try {
                // Загружаем все треки без пагинации
                const data = await api.get('/music?limit=1000');
                
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
                
                // Устанавливаем все треки в очередь
                setTracks(validatedTracks);
                
                // Если треки загружены, но нет текущего трека, устанавливаем первый трек как текущий
                if (validatedTracks.length > 0 && !currentTrack) {
                    console.log('[PlayerContext] Автоматически устанавливаем первый трек:', validatedTracks[0]);
                    setCurrentTrack(validatedTracks[0]);
                    setCurrentTrackIndex(0);
                }
            } catch (err) {
                console.error('[PlayerContext] Ошибка при загрузке треков:', err);
            }
        };

        fetchTracks();
    }, []);

    // Добавляем прослушиватель для обнаружения открытия плеера в отдельном окне
    useEffect(() => {
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
                    
                    // Если окно плеера открыто и мы не являемся этим окном,
                    // отключаем наш плеер как источник звука
                    if (!window.location.pathname.includes('/player')) {
                        setIsMasterPlayer(false);
                        audio.muted = true;
                    }
                } else {
                    setIsPlayerWindowOpen(false);
                }
            } else if (playerWindowTimestamp && !playerWindowClosed) {
                // Есть только метка открытия - окно открыто
                setIsPlayerWindowOpen(true);
                
                // Если окно плеера открыто и мы не являемся этим окном,
                // отключаем наш плеер как источник звука
                if (!window.location.pathname.includes('/player')) {
                    setIsMasterPlayer(false);
                    audio.muted = true;
                }
            } else {
                // Нет метки открытия или есть только метка закрытия - окно закрыто
                setIsPlayerWindowOpen(false);
            }
        };

        // Добавляем обработчик события хранилища для коммуникации между окнами
        const handleStorageEvent = (event: StorageEvent) => {
            if (event.key === 'player_window_opened') {
                setIsPlayerWindowOpen(true);
                
                // Если окно плеера открыто, и мы не являемся этим окном,
                // отключаем наш плеер как источник звука
                if (!window.location.pathname.includes('/player')) {
                    setIsMasterPlayer(false);
                    audio.muted = true;
                }
            } else if (event.key === 'player_window_closed') {
                setIsPlayerWindowOpen(false);
                
                // Если окно плеера закрыто, и мы находимся на главной странице,
                // можем снова стать мастер-плеером
                if (!isPlayerWindowOpen && !window.location.pathname.includes('/player')) {
                    // Проверяем, есть ли уже активный мастер
                    const storedMaster = localStorage.getItem(ACTIVE_PLAYER_STORAGE_KEY);
                    const currentTime = Date.now();
                    
                    if (!storedMaster || 
                        (JSON.parse(storedMaster).timestamp && 
                         currentTime - JSON.parse(storedMaster).timestamp > 5000)) {
                        becomeMasterPlayer();
                    }
                }
            } else if (event.key === 'play_track_command' && event.newValue) {
                // Обработка команды воспроизведения трека от другого окна
                try {
                    const commandData = JSON.parse(event.newValue);
                    const trackId = commandData.trackId;
                    const isPlayerWindow = window.location.pathname.includes('/player');
                    
                    // Только окно плеера должно реагировать на эту команду
                    if (isPlayerWindow) {
                        console.log('[PlayerContext] Получена команда воспроизведения трека:', trackId);
                        
                        // Найти трек в плейлисте
                        const trackIndex = tracks.findIndex(t => t.id === trackId);
                        if (trackIndex !== -1) {
                            // Воспроизводим найденный трек
                            const trackToPlay = tracks[trackIndex];
                            console.log('[PlayerContext] Воспроизведение трека из команды:', trackToPlay.title);
                            
                            // Обновляем текущий трек и начинаем воспроизведение
                            setCurrentTrack(trackToPlay);
                            setCurrentTrackIndex(trackIndex);
                            setIsPlaying(true);
                            
                            if (audio.src !== trackToPlay.audioUrl) {
                                audio.src = trackToPlay.audioUrl;
                            }
                            audio.muted = false;
                            audio.play().catch(err => {
                                console.error('Ошибка воспроизведения по команде:', err);
                                setIsPlaying(false);
                            });
                        }
                    }
                } catch (error) {
                    console.error('[PlayerContext] Ошибка при обработке команды воспроизведения:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageEvent);
        
        // Проверяем состояние при загрузке
        checkPlayerWindowState();
        
        // Периодически проверяем состояние окна плеера
        const checkInterval = setInterval(checkPlayerWindowState, 5000);

        return () => {
            window.removeEventListener('storage', handleStorageEvent);
            clearInterval(checkInterval);
        };
    }, [audio, becomeMasterPlayer, isPlayerWindowOpen]);

    // Управление воспроизведением
    const togglePlay = () => {
        if (!audio) return;

        const isPlayerWindow = window.location.pathname.includes('/player');
        const playerWindowOpened = localStorage.getItem('player_window_opened');
        const playerWindowClosed = localStorage.getItem('player_window_closed');
        let isPlayerWindowActive = false;
        
        if (playerWindowOpened && playerWindowClosed) {
            const openedTime = parseInt(playerWindowOpened);
            const closedTime = parseInt(playerWindowClosed);
            isPlayerWindowActive = openedTime > closedTime;
        } else if (playerWindowOpened && !playerWindowClosed) {
            isPlayerWindowActive = true;
        }

        if (isPlaying) {
            // При паузе останавливаем воспроизведение везде
            setIsPlaying(false);
            if (!audio.paused) {
                audio.pause();
            }
            
            sendSyncMessage({
                type: 'PAUSE_TRACK',
                data: { position: audio.currentTime }
            });
        } else {
            setIsPlaying(true);
            
            // Если открыто отдельное окно плеера
            if (isPlayerWindowActive) {
                if (!isPlayerWindow) {
                    // Если мы не в окне плеера, глушим звук
                    audio.muted = true;
                    if (!audio.paused) {
                        audio.pause();
                    }
                } else if (isMasterPlayer) {
                    // Если мы в окне плеера и мастер, воспроизводим
                    audio.muted = false;
                    audio.play().catch(err => {
                        console.error('Ошибка воспроизведения:', err);
                        setIsPlaying(false);
                    });
                }
            } else if (isMasterPlayer) {
                // Если отдельное окно не открыто и мы мастер-плеер
                audio.muted = false;
                audio.play().catch(err => {
                    console.error('Ошибка воспроизведения:', err);
                    setIsPlaying(false);
                });
            }
            
            sendSyncMessage({
                type: 'PLAY_TRACK',
                data: { 
                    track: currentTrack,
                    position: audio.currentTime 
                }
            });
        }
    };

    // Обновляем playTrack для гарантии воспроизведения в окне плеера
    const playTrack = (track: Track) => {
        console.log('[PlayerContext] Запрос на воспроизведение трека:', track.title);
        console.log('[PlayerContext] Аудио URL:', track.audioUrl);
        
        // Проверяем, открыто ли окно плеера
        const isPlayerWindow = window.location.pathname.includes('/player');
        const playerWindowOpened = localStorage.getItem('player_window_opened');
        const playerWindowClosed = localStorage.getItem('player_window_closed');
        let isPlayerWindowActive = false;
        
        if (playerWindowOpened && playerWindowClosed) {
            const openedTime = parseInt(playerWindowOpened);
            const closedTime = parseInt(playerWindowClosed);
            isPlayerWindowActive = openedTime > closedTime;
        } else if (playerWindowOpened && !playerWindowClosed) {
            isPlayerWindowActive = true;
        }
        
        console.log('[PlayerContext] Окно плеера активно:', isPlayerWindowActive);
        console.log('[PlayerContext] Текущее окно:', isPlayerWindow ? 'плеер' : 'другое окно');

        // Принудительное отключение всех аудио, кроме плеера в отдельном окне
        if (isPlayerWindowActive) {
            if (isPlayerWindow) {
                // Если это окно плеера, заглушаем все остальные аудио
                audioManager.muteAllExcept(audio);
            } else {
                // Если это не окно плеера, заглушаем все аудио включая свое
                audioManager.muteAll();
                audio.muted = true;
                if (!audio.paused) {
                    audio.pause();
                }
            }
        }

        // Проверяем, есть ли трек уже в плейлисте
        const existingTrackIndex = tracks.findIndex(t => t.id === track.id);
        console.log('[PlayerContext] Трек в плейлисте:', existingTrackIndex !== -1 ? 'да' : 'нет');

        // Если открыто отдельное окно плеера и мы не в окне плеера, 
        // только отправляем команду через localStorage
        if (isPlayerWindowActive && !isPlayerWindow) {
            // Добавляем трек в плейлист, если его там еще нет
            if (existingTrackIndex === -1) {
                setTracks(prevTracks => [...prevTracks, track]);
            }

            console.log('[PlayerContext] Отправка команды через localStorage для воспроизведения в окне плеера');
            
            // Отправить команду воспроизведения через localStorage
            localStorage.setItem('play_track_command', JSON.stringify({
                trackId: track.id,
                timestamp: Date.now()
            }));
            
            // Обновляем локальное состояние (но без воспроизведения)
            const trackToPlay = existingTrackIndex !== -1 ? tracks[existingTrackIndex] : track;
            const indexToPlay = existingTrackIndex !== -1 ? existingTrackIndex : tracks.length;
            
            setCurrentTrack(trackToPlay);
            setCurrentTrackIndex(indexToPlay);
            setIsPlaying(true);
            
            // Принудительно убедимся, что звук заглушен
            audio.muted = true;
            audio.pause();
            
            return; // Прерываем выполнение, чтобы избежать дальнейшей логики
        }
        
        // Если мы в окне плеера или отдельное окно не открыто, продолжаем стандартную логику
        // Добавляем трек в плейлист, если его там еще нет
        let trackToPlay = track;
        let indexToPlay = tracks.length;
        
        if (existingTrackIndex !== -1) {
            trackToPlay = tracks[existingTrackIndex];
            indexToPlay = existingTrackIndex;
        } else {
            setTracks(prevTracks => [...prevTracks, track]);
        }
        
        // Обновляем состояние
        setCurrentTrack(trackToPlay);
        setCurrentTrackIndex(indexToPlay);
        setIsPlaying(true);
        
        // Воспроизводим только если:
        // 1. Мы в окне плеера (и окно плеера активно)
        // 2. Или отдельное окно не открыто и мы мастер-плеер
        if ((isPlayerWindow && isPlayerWindowActive) || 
            (!isPlayerWindowActive && isMasterPlayer)) {
            
            console.log('[PlayerContext] Начинаем воспроизведение:', isPlayerWindow ? 'в окне плеера' : 'в мастер-плеере');
            
            if (audio.src !== trackToPlay.audioUrl) {
                audio.src = trackToPlay.audioUrl;
            }
            audio.muted = false;
            audio.play().catch(err => {
                console.error('Ошибка воспроизведения:', err);
                setIsPlaying(false);
            });
        } else {
            // В других случаях глушим звук
            console.log('[PlayerContext] Заглушаем звук в текущем окне');
            audio.muted = true;
            if (!audio.paused) {
                audio.pause();
            }
        }
        
        // Синхронизируем с другими окнами
        sendSyncMessage({
            type: 'PLAY_TRACK',
            data: { 
                track: trackToPlay,
                index: indexToPlay
            }
        });
    };

    // Регистрируем аудио в менеджере при создании
    useEffect(() => {
        // Регистрируем аудио элемент при создании
        audioManager.register(audio);
        
        // Отписываемся при размонтировании
        return () => {
            audioManager.unregister(audio);
        };
    }, [audio]);

    // Модифицируем playTrackByIndex для проверки активного окна плеера
    const playTrackByIndex = (index: number) => {
        if (index < 0 || index >= tracks.length) return;
        
        // Проверяем, открыто ли окно плеера и находимся ли мы в нем
        const isPlayerWindow = window.location.pathname.includes('/player');
        const playerWindowOpened = localStorage.getItem('player_window_opened');
        const playerWindowClosed = localStorage.getItem('player_window_closed');
        let isPlayerWindowActive = false;
        
        if (playerWindowOpened && playerWindowClosed) {
            const openedTime = parseInt(playerWindowOpened);
            const closedTime = parseInt(playerWindowClosed);
            isPlayerWindowActive = openedTime > closedTime;
        } else if (playerWindowOpened && !playerWindowClosed) {
            isPlayerWindowActive = true;
        }
        
        // Если окно плеера открыто, но мы не находимся в нем, только отправляем команду
        if (isPlayerWindowActive && !isPlayerWindow) {
            const track = tracks[index];
            
            // Обновляем локальное состояние
            setCurrentTrack(track);
            setCurrentTrackIndex(index);
            setIsPlaying(true);
            
            // Отправляем команду воспроизведения
            sendSyncMessage({
                type: 'PLAY_TRACK',
                data: { track, index }
            });
            return;
        }
        
        const track = tracks[index];
        setCurrentTrack(track);
        setCurrentTrackIndex(index);
        setIsPlaying(true);
        
        // Синхронизируем воспроизведение
        sendSyncMessage({
            type: 'PLAY_TRACK',
            data: { track, index }
        });
    };

    // Модифицируем nextTrack для проверки активного окна плеера
    const nextTrack = () => {
        if (tracks.length === 0) return;
        
        // Проверяем, открыто ли окно плеера и находимся ли мы в нем
        const isPlayerWindow = window.location.pathname.includes('/player');
        const playerWindowOpened = localStorage.getItem('player_window_opened');
        const playerWindowClosed = localStorage.getItem('player_window_closed');
        let isPlayerWindowActive = false;
        
        if (playerWindowOpened && playerWindowClosed) {
            const openedTime = parseInt(playerWindowOpened);
            const closedTime = parseInt(playerWindowClosed);
            isPlayerWindowActive = openedTime > closedTime;
        } else if (playerWindowOpened && !playerWindowClosed) {
            isPlayerWindowActive = true;
        }
        
        // Если окно плеера открыто, но мы не находимся в нем, только отправляем команду
        if (isPlayerWindowActive && !isPlayerWindow) {
            // Просто отправляем команду на следующий трек
            sendSyncMessage({
                type: 'NEXT_TRACK',
                data: null
            });
            return;
        }
        
        // Определяем следующий трек в зависимости от режима воспроизведения
        let nextIndex: number;
        
        // Если включен режим перемешивания
        if (shuffleMode) {
            // Определяем следующий трек в перемешанной очереди
            const currentPosition = shuffledQueue.indexOf(currentTrackIndex);
            if (currentPosition === -1 || currentPosition === shuffledQueue.length - 1) {
                // Если текущий трек не найден или последний, берем первый трек
                nextIndex = shuffledQueue[0];
            } else {
                // Иначе берем следующий трек в перемешанной очереди
                nextIndex = shuffledQueue[currentPosition + 1];
            }
        }
        // Если не включен режим перемешивания
        else {
            // Если режим повтора всего плейлиста или нет повтора
            if (repeatMode === 'all' || repeatMode === 'none') {
                // Если это последний трек
                if (currentTrackIndex === tracks.length - 1) {
                    // Если режим повтора всего плейлиста, начинаем с начала
                    if (repeatMode === 'all') {
                        nextIndex = 0;
                    } 
                    // Если нет повтора, останавливаемся на текущем треке
                    else {
                        return;
                    }
                } 
                // Если не последний трек, переходим к следующему
                else {
                    nextIndex = currentTrackIndex + 1;
                }
            }
            // Если режим повтора одного трека, остаемся на текущем треке
            else {
                nextIndex = currentTrackIndex;
            }
        }
        
        // Получаем данные о следующем треке
        const nextTrackData = tracks[nextIndex];
        
        // Переключаем на следующий трек
        setCurrentTrack(nextTrackData);
        setCurrentTrackIndex(nextIndex);
        setIsPlaying(true);
        
        // Если мы мастер-плеер, воспроизводим трек
        if (isMasterPlayer) {
            // Сбрасываем текущее время
            audio.currentTime = 0;
            
            // Воспроизводим новый трек
            if (isPlaying) {
                audio.play().catch(err => {
                    console.error('[PlayerContext] Ошибка при воспроизведении следующего трека:', err);
                });
            }
        }
        
        // Синхронизируем переключение с другими окнами
        sendSyncMessage({
            type: 'NEXT_TRACK',
            data: { index: nextIndex }
        });
    };

    // Модифицируем prevTrack для проверки активного окна плеера
    const prevTrack = () => {
        if (tracks.length === 0) return;
        
        // Проверяем, открыто ли окно плеера и находимся ли мы в нем
        const isPlayerWindow = window.location.pathname.includes('/player');
        const playerWindowOpened = localStorage.getItem('player_window_opened');
        const playerWindowClosed = localStorage.getItem('player_window_closed');
        let isPlayerWindowActive = false;
        
        if (playerWindowOpened && playerWindowClosed) {
            const openedTime = parseInt(playerWindowOpened);
            const closedTime = parseInt(playerWindowClosed);
            isPlayerWindowActive = openedTime > closedTime;
        } else if (playerWindowOpened && !playerWindowClosed) {
            isPlayerWindowActive = true;
        }
        
        // Если окно плеера открыто, но мы не находимся в нем, только отправляем команду
        if (isPlayerWindowActive && !isPlayerWindow) {
            // Просто отправляем команду на предыдущий трек
            sendSyncMessage({
                type: 'PREV_TRACK',
                data: null
            });
            return;
        }
        
        // Если прошло более 3 секунд или трек короче 10 секунд, перематываем в начало
        const shouldRestart = audio.currentTime > 3 || (audio.duration && audio.duration < 10);
        
        // Если надо просто перемотать в начало текущего трека
        if (shouldRestart) {
            // Если мы мастер-плеер, перематываем в начало
            if (isMasterPlayer) {
                audio.currentTime = 0;
                if (isPlaying) {
                    audio.play().catch(err => {
                        console.error('[PlayerContext] Ошибка при перезапуске текущего трека:', err);
                    });
                }
            }
            
            // Синхронизируем с другими окнами
            sendSyncMessage({
                type: 'SEEK_TO',
                data: { time: 0 }
            });
            return;
        }
        
        // Иначе переходим к предыдущему треку
        let prevIndex: number;
        
        // Если включен режим перемешивания
        if (shuffleMode) {
            // Определяем предыдущий трек в перемешанной очереди
            const currentPosition = shuffledQueue.indexOf(currentTrackIndex);
            if (currentPosition === -1 || currentPosition === 0) {
                // Если текущий трек не найден или первый, берем последний трек
                prevIndex = shuffledQueue[shuffledQueue.length - 1];
            } else {
                // Иначе берем предыдущий трек в перемешанной очереди
                prevIndex = shuffledQueue[currentPosition - 1];
            }
        }
        // Если не включен режим перемешивания
        else {
            // Если первый трек в плейлисте
            if (currentTrackIndex === 0) {
                // Если режим повтора всего плейлиста, переходим к последнему треку
                if (repeatMode === 'all') {
                    prevIndex = tracks.length - 1;
                } 
                // Иначе остаемся на первом треке
                else {
                    prevIndex = 0;
                }
            } 
            // Если не первый трек, переходим к предыдущему
            else {
                prevIndex = currentTrackIndex - 1;
            }
        }
        
        // Получаем данные о предыдущем треке
        const prevTrackData = tracks[prevIndex];
        
        // Если мы мастер-плеер и сейчас воспроизводится музыка
        if (isMasterPlayer && isPlaying) {
            // Обновляем состояние плеера
            setCurrentTrack(prevTrackData);
            setCurrentTrackIndex(prevIndex);
            
            // Воспроизводим предыдущий трек с начала
            audio.currentTime = 0;
            audio.play().catch(err => {
                console.error('[PlayerContext] Ошибка при воспроизведении предыдущего трека:', err);
                setIsPlaying(false);
            });
            
            // Синхронизируем с другими окнами
            sendSyncMessage({
                type: 'PREV_TRACK',
                data: { index: prevIndex }
            });
        } else {
            // Если не воспроизводится или не мастер-плеер, просто обновляем состояние
            // Всегда начинаем предыдущий трек с начала
            setCurrentTrack(prevTrackData);
            setCurrentTrackIndex(prevIndex);
            setIsPlaying(true);
            
            // Синхронизируем с другими окнами
            sendSyncMessage({
                type: 'PLAY_TRACK',
                data: { 
                    track: prevTrackData,
                    index: prevIndex,
                    position: 0
                }
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

    const toggleRepeat = () => {
        if (repeatMode === 'none') {
            setRepeatMode('all');
        } else if (repeatMode === 'all') {
            setRepeatMode('one');
        } else {
            setRepeatMode('none');
        }
        
        // Синхронизируем режим повтора
        sendSyncMessage({
            type: 'SET_REPEAT_MODE',
            data: { repeatMode: repeatMode === 'none' ? 'all' : repeatMode === 'all' ? 'one' : 'none' }
        });
    };

    const toggleShuffle = () => {
        // Переключаем режим
        const newShuffleMode = !shuffleMode;
        setShuffleMode(newShuffleMode);
        
        // Если включаем перемешивание
        if (newShuffleMode) {
            // Сохраняем оригинальную очередь треков
            setOriginalQueue([...tracks]);
            
            // Создаем массив индексов всех треков для перемешивания
            const indices = Array.from({length: tracks.length}, (_, i) => i);
            
            // Если есть текущий трек, удаляем его из перемешивания
            if (currentTrackIndex >= 0) {
                indices.splice(indices.indexOf(currentTrackIndex), 1);
            }
            
            // Перемешиваем индексы
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            
            // Если есть текущий трек, добавляем его в начало перемешанной очереди
            if (currentTrackIndex >= 0) {
                indices.unshift(currentTrackIndex);
                
                // Добавляем текущий трек в список уже использованных
                setShuffleUsedTracks(new Set([currentTrackIndex]));
            } else {
                // Сбрасываем список использованных треков
                setShuffleUsedTracks(new Set());
            }
            
            // Сохраняем перемешанную очередь индексов
            setShuffledQueue(indices);
            
            // Сохраняем очередь в localStorage для синхронизации между вкладками
            localStorage.setItem(SHUFFLE_QUEUE_KEY, JSON.stringify(indices));
            
            console.log('[PlayerContext] Режим перемешивания включен, очередь перемешана');
        } else {
            // Если выключаем перемешивание и есть оригинальная очередь
            if (originalQueue.length > 0) {
                // Находим текущий трек в оригинальной очереди
                let originalIndex = -1;
                if (currentTrack) {
                    originalIndex = originalQueue.findIndex(t => t.id === currentTrack.id);
                }
                
                // Восстанавливаем исходную очередь
                setTracks([...originalQueue]);
                
                // Обновляем индекс текущего трека
                if (originalIndex !== -1) {
                    setCurrentTrackIndex(originalIndex);
                }
                
                // Очищаем сохраненные данные о перемешивании
                setOriginalQueue([]);
                setShuffledQueue([]);
                setShuffleUsedTracks(new Set());
                
                // Удаляем сохраненную очередь из localStorage
                localStorage.removeItem(SHUFFLE_QUEUE_KEY);
                
                console.log('[PlayerContext] Режим перемешивания выключен, исходная очередь восстановлена');
            }
        }
        
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
        
        // Проверяем, содержит ли URL уже полный путь
        if (coverUrl.startsWith('http')) {
            return coverUrl;
        }
        
        // Если путь уже относительный или с /api/, не меняем его
        if (coverUrl.startsWith('/api/')) {
            return coverUrl;
        }
        
        // Если путь просто имя файла, добавляем относительный путь к API
        return `/api/music/cover/${coverUrl}`;
    };

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

    // После определения функции loadPlayerSession
    // Проверяем наличие активного плеера при инициализации
    useEffect(() => {
        const checkActiveMaster = () => {
            // Проверяем, открыто ли окно плеера
            const playerWindowTimestamp = localStorage.getItem('player_window_opened');
            const playerWindowClosed = localStorage.getItem('player_window_closed');
            let isPlayerWindowActive = false;
            
            if (playerWindowTimestamp && playerWindowClosed) {
                const openedTime = parseInt(playerWindowTimestamp);
                const closedTime = parseInt(playerWindowClosed);
                isPlayerWindowActive = openedTime > closedTime;
            } else if (playerWindowTimestamp && !playerWindowClosed) {
                isPlayerWindowActive = true;
            }
            
            // Если открыто окно плеера и мы не это окно,
            // не пытаемся стать мастер-плеером
            if (isPlayerWindowActive && !window.location.pathname.includes('/player')) {
                if (isMasterPlayer) {
                    setIsMasterPlayer(false);
                    audio.muted = true;
                }
                return;
            }
            
            // Если мы находимся в окне плеера, всегда становимся мастер-плеером
            if (window.location.pathname.includes('/player')) {
                if (!isMasterPlayer) {
                    becomeMasterPlayer();
                }
                return;
            }
            
            // Стандартная логика проверки активного мастера
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
                    // Мастер неактивен, становимся новым мастером (только если нет активного окна плеера)
                    if (!isPlayerWindowActive) {
                        becomeMasterPlayer();
                    }
                } else if (masterData.id === instanceId) {
                    // Мы уже мастер, просто обновляем heartbeat без изменения состояния
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
                // При ошибке парсинга пробуем стать мастером только если нет активного окна плеера
                if (!isPlayerWindowActive) {
                    becomeMasterPlayer();
                }
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

    // Обновляем перемешанную очередь из localStorage при инициализации компонента
    useEffect(() => {
        // Проверяем, есть ли сохраненная перемешанная очередь
        if (shuffleMode) {
            try {
                const storedQueue = localStorage.getItem(SHUFFLE_QUEUE_KEY);
                if (storedQueue) {
                    const parsedQueue = JSON.parse(storedQueue);
                    if (Array.isArray(parsedQueue) && parsedQueue.length > 0) {
                        setShuffledQueue(parsedQueue);
                    }
                }
            } catch (e) {
                console.warn('[PlayerContext] Ошибка при загрузке перемешанной очереди:', e);
            }
        }
    }, [shuffleMode]);

    // Сохраняем обновления shuffledQueue в localStorage
    useEffect(() => {
        if (shuffleMode && shuffledQueue.length > 0) {
            localStorage.setItem(SHUFFLE_QUEUE_KEY, JSON.stringify(shuffledQueue));
        }
    }, [shuffleMode, shuffledQueue]);

    // Экспортируем API плеера в глобальное пространство для доступа из других окон
    useEffect(() => {
        // Определяем публичное API
        window.playerApi = {
            playTrack,
            togglePlay,
            nextTrack,
            prevTrack,
            setVolume,
            becomeMasterPlayer
        };

        return () => {
            delete window.playerApi;
        };
    }, [playTrack, togglePlay, nextTrack, prevTrack, setVolume, becomeMasterPlayer]);

    // Обработка команды воспроизведения трека из localStorage
    useEffect(() => {
        const handlePlayTrackCommand = (event: StorageEvent) => {
            if (event.key === 'play_track_command' && event.newValue) {
                try {
                    const commandData = JSON.parse(event.newValue);
                    const trackId = commandData.trackId;
                    const isPlayerWindow = window.location.pathname.includes('/player');
                    
                    // Только окно плеера должно реагировать на эту команду
                    if (isPlayerWindow) {
                        console.log('[PlayerContext] Получена команда воспроизведения трека:', trackId);
                        
                        // Найти трек в плейлисте
                        const trackIndex = tracks.findIndex(t => t.id === trackId);
                        if (trackIndex !== -1) {
                            // Воспроизводим найденный трек
                            const trackToPlay = tracks[trackIndex];
                            console.log('[PlayerContext] Воспроизведение трека из команды:', trackToPlay.title);
                            
                            // Обновляем текущий трек и начинаем воспроизведение
                            setCurrentTrack(trackToPlay);
                            setCurrentTrackIndex(trackIndex);
                            setIsPlaying(true);
                            
                            // Принудительная проверка: только окно плеера может иметь незаглушенный звук
                            const allAudioElements = document.querySelectorAll('audio');
                            allAudioElements.forEach(audioEl => {
                                if (audioEl !== audio) {
                                    audioEl.muted = true;
                                    if (!audioEl.paused) {
                                        audioEl.pause();
                                    }
                                }
                            });
                            
                            // Воспроизводим аудио только в окне плеера
                            if (audio.src !== trackToPlay.audioUrl) {
                                audio.src = trackToPlay.audioUrl;
                            }
                            audio.muted = false;
                            audio.play().catch(err => {
                                console.error('Ошибка воспроизведения по команде:', err);
                                setIsPlaying(false);
                            });
                            
                            // Также отправляем сообщение другим окнам для синхронизации UI
                            sendSyncMessage({
                                type: 'PLAY_TRACK',
                                data: { 
                                    track: trackToPlay,
                                    index: trackIndex
                                }
                            });
                        }
                    } else {
                        // В других окнах глушим звук
                        audio.muted = true;
                        if (!audio.paused) {
                            audio.pause();
                        }
                    }
                } catch (error) {
                    console.error('[PlayerContext] Ошибка при обработке команды воспроизведения:', error);
                }
            }
        };
        
        window.addEventListener('storage', handlePlayTrackCommand);
        
        return () => {
            window.removeEventListener('storage', handlePlayTrackCommand);
        };
    }, [audio, tracks, sendSyncMessage, setCurrentTrack, setCurrentTrackIndex, setIsPlaying]);

    // Проверка и коррекция состояния аудио для предотвращения дублирования
    useEffect(() => {
        // Проверяем, открыто ли окно плеера
        const isPlayerWindow = window.location.pathname.includes('/player');
        const playerWindowActive = isPlayerWindowOpen;
        
        // Если окно плеера открыто, но мы не в нем - заглушаем звук
        if (playerWindowActive && !isPlayerWindow) {
            audio.muted = true;
            
            // Логируем состояние для отладки
            console.log('[PlayerContext] Проверка аудио: окно плеера открыто, звук заглушен в текущем окне');
            
            // Если до этого мы были мастер-плеером, утрачиваем этот статус
            if (isMasterPlayer) {
                setIsMasterPlayer(false);
            }
        }
        
        // Если мы окно плеера и активны, становимся мастер-плеером
        if (isPlayerWindow && playerWindowActive) {
            if (!isMasterPlayer) {
                becomeMasterPlayer();
            }
            
            // Логируем состояние для отладки
            console.log('[PlayerContext] Проверка аудио: текущее окно - окно плеера, становимся мастером');
        }
    }, [audio, isPlayerWindowOpen, isMasterPlayer, becomeMasterPlayer]);

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
                isPlayerWindowOpen,
                shuffledQueue,
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
                setRepeatMode,
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