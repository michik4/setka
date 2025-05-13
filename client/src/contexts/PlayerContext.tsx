import React, { createContext, useContext, useState, useEffect, useRef, useCallback, SetStateAction } from 'react';
import { Track } from '../types/music.types';
import { api } from '../utils/api';
import { BroadcastChannelManager } from '../utils/BroadcastChannelManager';
import { useQueue, dispatchQueueEvent } from './QueueContext';
import { 
    DEFAULT_COVER_URL,
    PLAYER_SYNC_CHANNEL,
    ACTIVE_PLAYER_STORAGE_KEY,
    PLAYER_SESSION_KEY,
    API_URL
} from '../config/constants';
import audioChannelService from '../services/AudioChannelService';
import audioValidationService from '../services/AudioValidationService';

// Константа для ID аудио канала - используем фиксированный префикс для всех компонентов
export const PLAYER_CHANNEL_PREFIX = "vseti_player_";

// Типы сообщений для синхронизации плеера
type PlayerSyncMessage = {
    type: 'PLAY_TRACK' | 'PAUSE_TRACK' | 'NEXT_TRACK' | 'PREV_TRACK' | 
          'SET_VOLUME' | 'UPDATE_STATE' | 'SEEK_TO' | 'UPDATE_QUEUE' |
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
    lastUpdate: number;
}

// Определение типа событий очереди
type QueueSyncEventTypes = 'QUEUE_UPDATED' | 'TRACK_ADDED' | 'TRACK_REMOVED' | 
                           'QUEUE_CLEARED' | 'TRACK_PLAYED' | 'HISTORY_UPDATED' |
                           'SHUFFLE_ON' | 'SHUFFLE_OFF';

export interface PlayerContextProps {
    // Основные свойства плеера
    currentTrack: Track | null;
    currentTrackIndex: number;
    isPlaying: boolean;
    audio: HTMLAudioElement;
    repeatMode: 'none' | 'one' | 'all';
    shuffleMode: boolean;
    isMasterPlayer: boolean;
    isPlayerWindowOpen: boolean;
    
    // Для совместимости с существующим кодом
    tracks: Track[];
    shuffledQueue: number[];
    
    // Сеттеры для основных свойств
    setCurrentTrack: React.Dispatch<React.SetStateAction<Track | null>>;
    setCurrentTrackIndex: React.Dispatch<React.SetStateAction<number>>;
    setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
    setTracks: React.Dispatch<React.SetStateAction<Track[]>>;
    setRepeatMode: React.Dispatch<React.SetStateAction<'none' | 'one' | 'all'>>;
    
    // Методы управления воспроизведением
    playTrack: (track: Track) => void;
    playTrackByIndex: (index: number) => void;
    pauseTrack: () => void;
    nextTrack: () => void;
    prevTrack: () => void;
    togglePlay: () => void;
    toggleRepeat: () => void;
    toggleShuffle: () => void;
    
    // Методы управления треками
    setVolume: (volume: number) => void;
    seekTo: (time: number) => void;
    
    // Вспомогательные методы
    getTrackCover: (coverUrl: string) => string;
    
    // Работа с очередью (для совместимости)
    addToQueue: (track: Track) => void;
    removeTrackFromQueue: (trackId: number) => void;
    clearQueue: () => void;
    
    // Идентификаторы и управление мастер-плеером
    instanceId: string;
    channelId: string;
    becomeMasterPlayer: () => boolean;
}

const PlayerContext = createContext<PlayerContextProps | undefined>(undefined);

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
        playerContextData?: {
            tracks: Track[];
            currentTrackIndex: number;
            isPlaying: boolean;
        };
    }
}

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
    const { queue, 
            currentTrackIndex: queueCurrentTrackIndex, 
            getNextTrack, 
            getPreviousTrack, 
            getCurrentTrack,
            setCurrentTrackIndex: setQueueTrackIndex,
            addToQueue: queueAddToQueue,
            removeFromQueue: queueRemoveFromQueue,
            clearQueue: queueClearQueue,
            replaceQueue: queueReplaceQueue
    } = useQueue();
            
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [repeatMode, setRepeatMode] = useState<'none' | 'one' | 'all'>('none');
    const [shuffleMode, setShuffleMode] = useState<boolean>(false);
    const [audio] = useState<HTMLAudioElement>(new Audio());
    const [isMasterPlayer, setIsMasterPlayer] = useState<boolean>(false);
    const lastHeartbeatRef = useRef<number>(0);
    const [instanceId] = useState<string>(() => 'player_' + Math.random().toString(36).substring(2, 9));
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [listenToQueueEvents, setListenToQueueEvents] = useState<boolean>(false);
    const [shuffledQueue, setShuffledQueue] = useState<number[]>([]);
    
    // Создаем согласованный ID канала для всех компонентов, использующих данный аудио элемент
    const channelId = `${PLAYER_CHANNEL_PREFIX}${instanceId}`;
    
    // Используем ref для BroadcastChannelManager
    const channelManagerRef = useRef<BroadcastChannelManager | null>(null);
    
    // Добавляем состояние для отслеживания открытия плеера в отдельном окне
    const [isPlayerWindowOpen, setIsPlayerWindowOpen] = useState<boolean>(false);
    
    // Создаем кеш для обложек
    const [coverCache, setCoverCache] = useState<Record<string, string>>({});
    
    // Новый ref для хранения таймера heartbeat
    const masterHeartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Флаг для отслеживания запроса на становление мастер-плеером вне эффектов
    const becomeMasterRequestRef = useRef<boolean>(false);

    // Инициализируем аудиоканал
    useEffect(() => {
        // Регистрируем аудио элемент в сервисе с согласованным ID канала
        console.log(`[PlayerContext] Регистрация аудио канала: ${channelId}`);
        audioChannelService.registerAudio(channelId, audio, isMasterPlayer);
        
        // При размонтировании удаляем регистрацию
        return () => {
            console.log(`[PlayerContext] Удаление аудио канала: ${channelId}`);
            audioChannelService.unregisterAudio(channelId);
        };
    }, [channelId, audio, isMasterPlayer]);
    
    // Функция для проверки и обеспечения регистрации аудио канала
    const ensureAudioChannelRegistered = useCallback(() => {
        // Проверяем, зарегистрирован ли канал
        const isRegistered = audioChannelService.isChannelRegistered(channelId);
        
        if (!isRegistered) {
            // Если канал не зарегистрирован, регистрируем снова
            console.log(`[PlayerContext] Повторная регистрация аудио канала ${channelId}`);
            audioChannelService.registerAudio(channelId, audio, isMasterPlayer);
            return true;
        }
        return false;
    }, [channelId, audio, isMasterPlayer]);
    
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
    
    // Функция для обработки сообщений (сокращенная версия)
    const handleChannelMessage = (message: PlayerSyncMessage) => {
        if (message.source === instanceId) {
            return;
        }

        try {
            switch (message.type) {
                case 'PLAY_TRACK':
                    if (message.data && message.data.track) {
                        const receivedTrack = message.data.track as Track;
                        
                        // Обновляем состояние
                        setCurrentTrack(receivedTrack);
                        setIsPlaying(true);
                        if (message.data.index !== undefined) {
                            setCurrentTrackIndex(message.data.index);
                            setQueueTrackIndex(message.data.index);
                        }
                        
                        // Проверяем состояние окна плеера
                        const isPlayerWindow = window.location.pathname.includes('/player');
                        const playerWindowOpen = localStorage.getItem('player_window_opened');
                        
                        if (isPlayerWindow || (!playerWindowOpen && isMasterPlayer)) {
                            audioChannelService.playTrack(channelId, receivedTrack, 0, true);
                        }
                    }
                    break;

                case 'PAUSE_TRACK':
                    setIsPlaying(false);
                    audioChannelService.pauseActiveChannel();
                    break;

                case 'SEEK_TO':
                    if (message.data && message.data.position !== undefined) {
                        audio.currentTime = message.data.position;
                    }
                    break;

                case 'BECOME_MASTER':
                    if (isMasterPlayer) {
                        setIsMasterPlayer(false);
                        audio.muted = true;
                    }
                    break;

                case 'NEXT_TRACK':
                case 'PREV_TRACK':
                    if (message.data && message.data.index !== undefined) {
                        const nextTrack = queue[message.data.index];
                        if (nextTrack) {
                            setCurrentTrack(nextTrack);
                            setCurrentTrackIndex(message.data.index);
                            setQueueTrackIndex(message.data.index);
                        }
                    }
                    break;
            }
        } catch (error) {
            console.error('[PlayerContext] Ошибка при обработке сообщения:', error);
        }
    };
    
    // Функция для отправки сообщения синхронизации
    const sendSyncMessage = useCallback((message: PlayerSyncMessage) => {
        if (channelManagerRef.current) {
            // Добавляем идентификатор источника и timestamp
            message.source = instanceId;
            message.timestamp = Date.now();
            channelManagerRef.current.postMessage(message);
        }
    }, [instanceId]);

    // Синхронизация с QueueContext
    useEffect(() => {
        const currentQueueTrack = getCurrentTrack();
        if (currentQueueTrack && (!currentTrack || currentTrack.id !== currentQueueTrack.id)) {
            setCurrentTrack(currentQueueTrack);
        }
        
        if (queueCurrentTrackIndex !== currentTrackIndex) {
            setCurrentTrackIndex(queueCurrentTrackIndex);
        }
    }, [queueCurrentTrackIndex, getCurrentTrack]);

    // Управление воспроизведением
    const togglePlay = () => {
        if (!currentTrack) return;
        
        if (isPlaying) {
            // Ставим на паузу
            setIsPlaying(false);
            
            audioChannelService.pauseActiveChannel().then(() => {
                // Отправляем сообщение о паузе
                sendSyncMessage({
                    type: 'PAUSE_TRACK',
                    data: { position: audio.currentTime }
                });
            });
        } else {
            // Проверяем и обеспечиваем регистрацию канала
            ensureAudioChannelRegistered();
            
            // Возобновляем воспроизведение через сервис
            if (currentTrack) {
                audioChannelService.playTrack(channelId, currentTrack, audio.currentTime);
            }
            
            setIsPlaying(true);
            
            // Отправляем сообщение о воспроизведении
            sendSyncMessage({
                type: 'PLAY_TRACK',
                data: { 
                    track: currentTrack,
                    index: currentTrackIndex,
                    position: audio.currentTime 
                }
            });
        }
    };

    // Оптимизированная функция playTrack
    const playTrack = (track: Track) => {
        console.log('[PlayerContext] Воспроизведение трека:', track.title);
        
        // Устанавливаем трек как текущий
        setCurrentTrack(track);
        setIsPlaying(true);
        
        // Обновляем индекс текущего трека в очереди
        const trackIndex = queue.findIndex(t => t.id === track.id);
        if (trackIndex !== -1) {
            setCurrentTrackIndex(trackIndex);
            setQueueTrackIndex(trackIndex);
        } else {
            // Если трека нет в очереди, добавляем его
            queueAddToQueue(track);
            // Позже текущий индекс обновится через событие
        }
        
        // Проверяем и обеспечиваем регистрацию канала
        ensureAudioChannelRegistered();
        
        // Используем AudioChannelService для воспроизведения
        audioChannelService.playTrack(channelId, track, 0, true);
        
        // Отправляем сообщение для синхронизации
        sendSyncMessage({
            type: 'PLAY_TRACK',
            data: { 
                track,
                index: trackIndex
            }
        });
    };

    // Упрощенная функция playTrackByIndex
    const playTrackByIndex = (index: number) => {
        if (index < 0 || index >= queue.length) {
            console.error(`[PlayerContext] Некорректный индекс трека: ${index}`);
            return;
        }
        
        const track = queue[index];
        console.log('[PlayerContext] Воспроизведение трека по индексу:', index, track.title);
        
        setCurrentTrack(track);
        setCurrentTrackIndex(index);
        setQueueTrackIndex(index);
        setIsPlaying(true);
        
        // Проверяем и обеспечиваем регистрацию канала
        ensureAudioChannelRegistered();
        
        // Используем AudioChannelService для воспроизведения
        audioChannelService.playTrack(channelId, track, 0, true);
        
        // Отправляем сообщение для синхронизации
        sendSyncMessage({
            type: 'PLAY_TRACK',
            data: { 
                track,
                index
            }
        });
    };

    // Упрощенная функция nextTrack
    const nextTrack = () => {
        // Учитываем режим повтора при переключении на следующий трек
        if (repeatMode === 'one' && currentTrack) {
            // В режиме повтора одного трека, при нажатии кнопки "следующий трек"
            // просто перезапускаем текущий трек с начала
            console.log('[PlayerContext] Режим повтора одного трека - перезапускаем текущий');
            audio.currentTime = 0;
            if (isPlaying && isMasterPlayer) {
                audioChannelService.playTrack(channelId, currentTrack, 0, true);
            }
            return;
        }
        
        if (currentTrackIndex === queue.length - 1) {
            // Достигнут конец очереди - всегда переходим к первому треку при нажатии на кнопку
            console.log('[PlayerContext] Конец очереди, переходим к первому треку');
            playTrackByIndex(0);
            return;
        }
        
        const nextTrackData = getNextTrack();
        if (!nextTrackData) return;
        
        const nextIndex = queue.findIndex(t => t.id === nextTrackData.id);
        if (nextIndex === -1) return;
        
        // Устанавливаем новый трек
        setCurrentTrack(nextTrackData);
        setCurrentTrackIndex(nextIndex);
        setQueueTrackIndex(nextIndex);
        
        
        // Проверяем и обеспечиваем регистрацию канала
        ensureAudioChannelRegistered();
        
        // Воспроизводим через AudioChannelService
        if (isPlaying) {
            audioChannelService.playTrack(channelId, nextTrackData, 0, true);
        }
        
        // Отправляем сообщение об изменении трека
        sendSyncMessage({
            type: 'NEXT_TRACK',
            data: { index: nextIndex }
        });
    };

    // Упрощенная функция prevTrack
    const prevTrack = () => {
        // Проверка особого случая: переход к предыдущему треку после начала воспроизведения текущего
        if (audio && audio.currentTime > 3) {
            // Если прошло более 3 секунд, просто перематываем на начало текущего трека
            audio.currentTime = 0;
            
            // Отправляем событие об изменении позиции
            sendSyncMessage({
                type: 'SEEK_TO',
                data: { position: 0 }
            });
            
            return;
        }
        
        // Учитываем режим повтора одного трека
        if (repeatMode === 'one' && currentTrack) {
            // В режиме повтора одного трека, при нажатии кнопки "предыдущий трек"
            // просто перезапускаем текущий трек с начала
            console.log('[PlayerContext] Режим повтора одного трека - перезапускаем текущий');
            audio.currentTime = 0;
            if (isPlaying && isMasterPlayer) {
                audioChannelService.playTrack(channelId, currentTrack, 0, true);
            }
            return;
        }
        
        // Учитываем режим повтора при переключении на предыдущий трек
        if (currentTrackIndex === 0) {
            // Находимся на первом треке очереди
            if (repeatMode === 'all') {
                // Режим повтора всей очереди - переходим к последнему треку
                console.log('[PlayerContext] Начало очереди, переходим в конец (prevTrack)');
                playTrackByIndex(queue.length - 1);
                return;
            }
        }
        
        const prevTrackData = getPreviousTrack();
        if (!prevTrackData) return;
        
        const prevIndex = queue.findIndex(t => t.id === prevTrackData.id);
        if (prevIndex === -1) return;
        
        // Устанавливаем предыдущий трек
        setCurrentTrack(prevTrackData);
        setCurrentTrackIndex(prevIndex);
        setQueueTrackIndex(prevIndex);
        
        // Проверяем и обеспечиваем регистрацию канала
        ensureAudioChannelRegistered();
        
        // Воспроизводим через AudioChannelService
        if (isPlaying) {
            audioChannelService.playTrack(channelId, prevTrackData, 0, true);
        }
        
        // Отправляем сообщение об изменении трека
        sendSyncMessage({
            type: 'PREV_TRACK',
            data: { index: prevIndex }
        });
    };

    // Упрощенная функция pauseTrack
    const pauseTrack = () => {
        if (!isPlaying) return;
        
        // Останавливаем воспроизведение через сервис
        audioChannelService.pauseActiveChannel();
        
        setIsPlaying(false);
        
        // Отправляем сообщение о паузе
        sendSyncMessage({
            type: 'PAUSE_TRACK',
            data: { position: audio.currentTime }
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
        const newShuffleMode = !shuffleMode;
        setShuffleMode(newShuffleMode);
        
        // Синхронизируем режим перемешивания
        sendSyncMessage({
            type: 'SET_SHUFFLE_MODE',
            data: { shuffleMode: newShuffleMode }
        });
        
        // Отправляем событие переключения режима в QueueContext
        // Используем отдельный параметр forceGenerate: true, чтобы гарантировать 
        // генерацию новой перемешанной очереди
        dispatchQueueEvent({
            type: 'TOGGLE_SHUFFLE',
            data: { 
                shuffleMode: newShuffleMode,
                forceGenerate: true 
            }
        });
        
        console.log(`[PlayerContext] Режим перемешивания ${newShuffleMode ? 'включен' : 'выключен'}`);
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
                data: { position: time }
            });
        }
    };

    // Функция для получения URL обложки
    const getTrackCover = useCallback((coverUrl: string): string => {
        if (!coverUrl || coverUrl === '') {
            return DEFAULT_COVER_URL;
        }
        
        // Проверяем, есть ли обложка в кеше
        if (coverCache[coverUrl]) {
            return coverCache[coverUrl];
        }
        
        let resultUrl: string;
        
        // Проверяем, содержит ли URL уже полный путь
        if (coverUrl.startsWith('http')) {
            resultUrl = coverUrl;
        } 
        // Если путь уже относительный или с /api/, не меняем его
        else if (coverUrl.startsWith('/api/')) {
            resultUrl = coverUrl;
        }
        // Если путь просто имя файла, добавляем относительный путь к API
        else {
            resultUrl = `/api/music/cover/${coverUrl}`;
        }
        
        // Вместо прямого обновления кеша запоминаем URL для последующего обновления
        // без мутации состояния во время рендеринга
        window.setTimeout(() => {
            setCoverCache(prev => ({
                ...prev,
                [coverUrl]: resultUrl
            }));
        }, 0);
        
        return resultUrl;
    }, [coverCache]);

    // Функция для добавления трека в очередь - делегируем в QueueContext
    const addToQueue = (track: Track) => {
        console.log('[PlayerContext] Перенаправление запроса добавления трека в очередь в QueueContext');
        queueAddToQueue(track);
    };

    // Функция для удаления трека из очереди - делегируем в QueueContext
    const removeTrackFromQueue = (trackId: number) => {
        console.log('[PlayerContext] Перенаправление запроса удаления трека из очереди в QueueContext');
        queueRemoveFromQueue(trackId);
    };

    // Функция для очистки очереди - делегируем в QueueContext
    const clearQueue = () => {
        console.log('[PlayerContext] Перенаправление запроса очистки очереди в QueueContext');
        queueClearQueue();
    };

    // Функция для установки треков - делегируем в QueueContext
    const setTracks = (tracks: SetStateAction<Track[]>) => {
        if (typeof tracks === 'function') {
            const newTracks = tracks(queue);
            queueReplaceQueue(newTracks);
        } else {
            queueReplaceQueue(tracks);
        }
    };

    // Функция для становления мастер-плеером с использованием useRef
    const becomeMasterPlayer = useCallback(() => {
        // Устанавливаем флаг для обработки в useEffect
        becomeMasterRequestRef.current = true;
        
        // Возвращаем true, если мы уже мастер, или если запрос установлен
        return isMasterPlayer || becomeMasterRequestRef.current;
    }, [isMasterPlayer]);

    // Эффект для обработки запроса на становление мастер-плеером
    useEffect(() => {
        if (becomeMasterRequestRef.current) {
            console.log('[PlayerContext] Обработка запроса на становление мастер-плеером');
            
            // Проверяем, зарегистрирован ли канал
            if (!audioChannelService.isChannelRegistered(channelId)) {
                console.log(`[PlayerContext] Повторная регистрация аудио канала при становлении мастером: ${channelId}`);
                audioChannelService.registerAudio(channelId, audio, true);
            } else {
                console.log(`[PlayerContext] Установка канала ${channelId} как мастера`);
                audioChannelService.setMasterChannel(channelId);
            }
            
            // Устанавливаем себя как мастер-плеер
            setIsMasterPlayer(true);
            
            // Отправляем сообщение другим плеерам
            sendSyncMessage({
                type: 'BECOME_MASTER',
                data: {
                    timestamp: Date.now()
                }
            });
            
            // Сохраняем информацию в localStorage
            localStorage.setItem(ACTIVE_PLAYER_STORAGE_KEY, instanceId);
            
            // Сбрасываем флаг запроса
            becomeMasterRequestRef.current = false;
        }
    }, [audio, channelId, instanceId, becomeMasterRequestRef.current, sendSyncMessage]);

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
                        
                        // Найти трек в очереди
                        const trackIndex = queue.findIndex(t => t.id === trackId);
                        if (trackIndex !== -1) {
                            playTrackByIndex(trackIndex);
                        }
                    } else {
                        // В других окнах глушим звук
                        audio.muted = true;
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
    }, [audio, becomeMasterPlayer, isPlayerWindowOpen, queue]);

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

    // Добавляем слушатель событий для аудио элемента
    useEffect(() => {
        if (!audio) return;
        
        // При загрузке метаданных аудио
        const handleLoadedMetadata = () => {
            // Всегда начинаем воспроизведение с начала трека
            if (currentTrack) {
                audio.currentTime = 0;
            }
        };
        
        // Когда будет загружено достаточно данных для начала воспроизведения
        const handleCanPlay = () => {
            // Если должен воспроизводиться, но пока не воспроизводится,
            // значит это перезагрузка - восстанавливаем воспроизведение
            if (isPlaying && audio.paused && isMasterPlayer) {
                console.log('[PlayerContext] Автоматическое восстановление воспроизведения');
                audioChannelService.playTrack(channelId, currentTrack!, audio.currentTime);
            }
        };
        
        // Добавляем обработчик окончания трека
        const handleEnded = () => {
            console.log('[PlayerContext] Трек закончился, проверка режима повтора:', repeatMode);
            if (repeatMode === 'one') {
                // Повтор текущего трека
                audio.currentTime = 0;
                if (isMasterPlayer) {
                    audio.play().catch(err => {
                        console.error('[PlayerContext] Ошибка при повторе трека:', err);
                    });
                }
            } else if (repeatMode === 'all') {
                // При режиме повтора всей очереди
                if (currentTrackIndex >= queue.length - 1) {
                    // Если это последний трек, возвращаемся к первому
                    console.log('[PlayerContext] Конец очереди, повторяем с начала');
                    playTrackByIndex(0);
                } else {
                    // Иначе просто переходим к следующему треку
                    nextTrack();
                }
            } else {
                // Режим без повтора - просто переходим к следующему треку
                if (currentTrackIndex < queue.length - 1) {
                    nextTrack();
                } else {
                    console.log('[PlayerContext] Воспроизведение завершено, достигнут конец очереди');
                    // Если это последний трек и нет повтора, останавливаем воспроизведение
                    setIsPlaying(false);
                }
            }
        };
        
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('ended', handleEnded);
        
        // Очистка при размонтировании
        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [audio, currentTrack, isPlaying, isMasterPlayer, channelId, repeatMode, currentTrackIndex, queue, nextTrack, playTrackByIndex, setIsPlaying]);

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

        // Экспортируем данные для QueueContext
        window.playerContextData = {
            tracks: queue,
            currentTrackIndex,
            isPlaying
        };

        return () => {
            delete window.playerApi;
            delete window.playerContextData;
        };
    }, [playTrack, togglePlay, nextTrack, prevTrack, setVolume, becomeMasterPlayer, currentTrackIndex, isPlaying, queue]);

    // Добавим эффект для подписки на события QueueContext
    useEffect(() => {
        // Обработчик событий от QueueContext
        const handleQueueEvent = (event: CustomEvent) => {
            if (!event.detail) return;
            
            const queueEvent = event.detail;
            console.log('[PlayerContext] Получено событие от QueueContext:', queueEvent.type);
            
            // Обработка различных типов событий
            switch (queueEvent.type) {
                case 'TRACK_PLAYED':
                    // Если QueueContext сообщает о воспроизведении трека, синхронизируем состояние
                    if (queueEvent.data && queueEvent.data.track) {
                        setCurrentTrack(queueEvent.data.track);
                        if (queueEvent.data.index !== undefined) {
                            setCurrentTrackIndex(queueEvent.data.index);
                        }
                        setIsPlaying(true);
                    }
                    break;
                    
                case 'QUEUE_UPDATED':
                    // Если очередь обновилась, синхронизируем наш плеер
                    if (queueEvent.data && queueEvent.data.currentTrackIndex !== undefined) {
                        setCurrentTrackIndex(queueEvent.data.currentTrackIndex);
                    }
                    
                    // Обновляем перемешанную очередь, если она была изменена
                    if (queueEvent.data && queueEvent.data.shuffleMode !== undefined) {
                        setShuffleMode(queueEvent.data.shuffleMode);
                    }
                    break;
                    
                case 'TRACK_ADDED':
                    // Если добавлен новый трек, проверяем, есть ли уже текущий трек
                    if (!currentTrack && queueEvent.data && queueEvent.data.track) {
                        // Если текущий трек не выбран, устанавливаем первый трек как текущий
                        setCurrentTrack(queueEvent.data.track);
                        setCurrentTrackIndex(0);
                    }
                    break;
                    
                case 'QUEUE_CLEARED':
                    // Если очередь очищена, сбрасываем состояние плеера
                    setCurrentTrack(null);
                    setCurrentTrackIndex(-1);
                    setIsPlaying(false);
                    
                    // Останавливаем воспроизведение
                    if (!audio.paused) {
                        audio.pause();
                        audio.currentTime = 0;
                    }
                    break;
            }
        };
        
        // Подписываемся на события, только если плеер инициализирован
        if (isInitialized) {
            document.addEventListener('queue_sync_event', handleQueueEvent as EventListener);
            setListenToQueueEvents(true);
        }
        
        return () => {
            document.removeEventListener('queue_sync_event', handleQueueEvent as EventListener);
        };
    }, [isInitialized, queue, audio, currentTrack]);

    // Добавим функцию для отправки событий player_event
    const sendPlayerEvent = (eventType: string, eventData?: any) => {
        // Создаем событие с данными
        const event = new CustomEvent('player_event', {
            detail: {
                type: eventType,
                data: eventData,
                source: 'PlayerContext',
                timestamp: Date.now()
            }
        });
        
        // Отправляем событие
        document.dispatchEvent(event);
    };

    // Добавим обработчик beforeunload чтобы не сохранять позицию при выходе
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Удаляем сохраненную позицию текущего трека перед закрытием окна
            if (currentTrack) {
                const positionKey = `player_position_${currentTrack.id}`;
                localStorage.removeItem(positionKey);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [currentTrack]);

    // Контекст для предоставления дочерним компонентам
    const contextValue: PlayerContextProps = {
        currentTrack,
        currentTrackIndex,
        isPlaying,
        audio,
        repeatMode,
        shuffleMode,
        isMasterPlayer,
        isPlayerWindowOpen,
        tracks: queue,
        shuffledQueue,
        setCurrentTrack,
        setCurrentTrackIndex,
        setIsPlaying,
        setTracks,
        setRepeatMode,
        playTrack,
        playTrackByIndex,
        pauseTrack,
        nextTrack,
        prevTrack,
        togglePlay,
        toggleRepeat,
        toggleShuffle,
        setVolume,
        seekTo,
        getTrackCover,
        addToQueue,
        removeTrackFromQueue,
        clearQueue,
        instanceId,
        channelId,
        becomeMasterPlayer
    };

    return (
        <PlayerContext.Provider value={contextValue}>
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