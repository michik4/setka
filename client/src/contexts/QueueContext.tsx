import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Track } from '../types/music.types';
import { tokenService } from '../utils/api';

// Добавим объявление типа для window.playerContextData
declare global {
  interface Window {
    playerContextData?: {
      tracks: Track[];
      currentTrackIndex: number;
      isPlaying: boolean;
    };
  }
}

// URL API из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Константа для хранения данных очереди в localStorage
const QUEUE_STORAGE_KEY = 'queue_storage';
const QUEUE_HISTORY_KEY = 'queue_history';

// Константа для имени канала обмена сообщениями между QueueContext и PlayerContext
const QUEUE_SYNC_EVENT = 'queue_sync_event';

// Типы событий для синхронизации
type QueueSyncEventTypes = 'QUEUE_UPDATED' | 'TRACK_ADDED' | 'TRACK_REMOVED' | 
                          'QUEUE_CLEARED' | 'TRACK_PLAYED' | 'HISTORY_UPDATED' |
                          'TOGGLE_SHUFFLE' | 'SET_SHUFFLE_MODE' | 'SHUFFLE_MODE_CHANGED';

// Интерфейс события синхронизации
interface QueueSyncEvent {
  type: QueueSyncEventTypes;
  data?: any;
}

// Интерфейс контекста очереди
export interface QueueContextProps {
  // Основные данные
  queue: Track[]; // Текущая очередь треков (может быть оригинальной или перемешанной)
  originalQueue: Track[]; // Оригинальная очередь без перемешивания
  history: Track[]; // История воспроизведенных треков
  currentTrackIndex: number; // Индекс текущего трека в очереди
  shuffleMode: boolean; // Режим перемешивания очереди
  
  // Методы управления очередью
  addToQueue: (track: Track) => void; // Добавить трек в очередь
  addTracksToQueue: (tracks: Track[]) => void; // Добавить несколько треков в очередь
  removeFromQueue: (trackId: number) => void; // Удалить трек из очереди
  clearQueue: () => void; // Очистить очередь
  
  // Методы управления историей
  addToHistory: (track: Track) => void; // Добавить трек в историю
  clearHistory: () => void; // Очистить историю
  
  // Методы управления позицией в очереди
  moveTrack: (fromIndex: number, toIndex: number) => void; // Переместить трек в очереди
  setCurrentTrackIndex: (index: number) => void; // Установить индекс текущего трека
  
  // Другие возможности
  replaceQueue: (tracks: Track[]) => void; // Заменить очередь полностью
  getNextTrack: () => Track | null; // Получить следующий трек
  getPreviousTrack: () => Track | null; // Получить предыдущий трек из истории
  
  // Получение треков
  getCurrentTrack: () => Track | null; // Получить текущий трек
  getTrackByIndex: (index: number) => Track | null; // Получить трек по индексу
  
  // Загрузка треков пользователя
  fetchUserTracks: () => Promise<void>; // Загрузить треки пользователя из раздела "Моя музыка"
  
  // Управление режимом shuffle
  toggleShuffleMode: () => void; // Включить/выключить режим перемешивания
  applyShuffleMode: (enable: boolean) => void; // Применить режим перемешивания с указанным значением
}

// Создаем контекст
const QueueContext = createContext<QueueContextProps | undefined>(undefined);

// Функция для отправки события синхронизации
export const dispatchQueueEvent = (event: QueueSyncEvent) => {
  const customEvent = new CustomEvent(QUEUE_SYNC_EVENT, { detail: event });
  document.dispatchEvent(customEvent);
};

// Определяю промежуточный тип для результата маппинга
type MappedTrack = Track | null;

// Провайдер контекста очереди
export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Состояния для очереди и истории
  const [originalQueue, setOriginalQueue] = useState<Track[]>([]); // Оригинальная очередь без перемешивания
  const [queue, setQueue] = useState<Track[]>([]); // Рабочая очередь (может быть оригинальной или перемешанной)
  const [history, setHistory] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [shuffleMode, setShuffleMode] = useState<boolean>(false);
  
  // Создаем ref для отслеживания, загружено ли начальное состояние из PlayerContext
  const initialDataLoadedRef = useRef<boolean>(false);
  const shouldLoadUserTracksRef = useRef<boolean>(false);
  const fetchRetryCountRef = useRef<number>(0);
  
  // Функция для загрузки треков пользователя из раздела "Моя музыка"
  const fetchUserTracks = async () => {
    try {
      console.log('[QueueContext] Загрузка треков пользователя для инициализации очереди...');
      
      // Получаем токен из tokenService
      const token = tokenService.getToken();
      
      const response = await fetch(`${API_URL}/music?limit=1000`, {
        headers: {
          'Accept': 'application/json',
          // Добавляем токен в заголовок Authorization, если он есть
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        // Удаляем credentials: 'include', так как теперь используем токены, а не куки
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ошибка: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[QueueContext] Получены треки пользователя:', data);
      
      if (data && data.tracks && Array.isArray(data.tracks) && data.tracks.length > 0) {
        // Преобразуем треки в нужный формат с проверкой каждого поля
        const userTracks = data.tracks
          .map((track: any): MappedTrack => {
            if (!track) return null;
            
            return {
              id: track.id || Math.random() * 10000, // Генерируем ID, если его нет
              title: track.title || 'Неизвестный трек',
              artist: track.artist || 'Неизвестный исполнитель',
              duration: track.duration || '0:00',
              coverUrl: track.coverUrl || '/api/music/cover/default.png',
              audioUrl: track.filename ? `${API_URL}/music/file/${track.filename}` : '',
              playCount: track.playCount || 0,
              filename: track.filename || ''
            };
          })
          .filter((item: MappedTrack): item is Track => item !== null && Boolean(item?.filename)); // Фильтруем некорректные треки
        
        console.log(`[QueueContext] Инициализация очереди треками пользователя (${userTracks.length} треков)`);
        
        if (userTracks.length > 0) {
          setQueue(userTracks);
          setCurrentTrackIndex(0);
          initialDataLoadedRef.current = true;
          
          // Отправляем событие об обновлении очереди
          dispatchQueueEvent({
            type: 'QUEUE_UPDATED',
            data: { queue: userTracks, currentTrackIndex: 0 }
          });
          
          // Также сохраняем в localStorage для последующих загрузок
          try {
            localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(userTracks));
          } catch (storageError) {
            console.error('[QueueContext] Ошибка при сохранении треков в localStorage:', storageError);
          }
        } else {
          console.warn('[QueueContext] Не найдено валидных треков пользователя после фильтрации');
        }
      } else {
        console.warn('[QueueContext] Не найдено треков пользователя на сервере');
      }
    } catch (error) {
      console.error('[QueueContext] Ошибка при загрузке треков пользователя:', error);
      
      // В случае ошибки проверяем, есть ли треки в очереди
      if (queue.length === 0) {
        // Если очередь пуста, устанавливаем некоторый стандартный трек или показываем сообщение
        console.log('[QueueContext] Установка пустой очереди из-за ошибки загрузки');
        setQueue([]);
        setCurrentTrackIndex(-1);
      }
    }
  };
  
  // Загружаем данные из localStorage при инициализации
  useEffect(() => {
    try {
      const storedQueue = localStorage.getItem(QUEUE_STORAGE_KEY);
      const storedHistory = localStorage.getItem(QUEUE_HISTORY_KEY);
      
      if (storedQueue) {
        try {
          const parsedQueue = JSON.parse(storedQueue);
          
          // Проверяем, что загруженные данные - действительно массив и он не пуст
          if (Array.isArray(parsedQueue) && parsedQueue.length > 0 && parsedQueue[0].id) {
            console.log(`[QueueContext] Загружено ${parsedQueue.length} треков из localStorage`);
            
            // Проверяем, что у каждого трека есть необходимые поля
            const validTracks = parsedQueue.filter(track => 
              track && 
              track.id && 
              track.title && 
              (track.audioUrl || track.filename)
            );
            
            if (validTracks.length > 0) {
              setQueue(validTracks);
              
              // Устанавливаем индекс текущего трека - начинаем с первого трека
              setCurrentTrackIndex(0);
              
              // Отмечаем, что данные загружены успешно
              initialDataLoadedRef.current = true;
              
              // Отправляем событие об обновлении очереди
              dispatchQueueEvent({
                type: 'QUEUE_UPDATED',
                data: { queue: validTracks, currentTrackIndex: 0 }
              });
              
              console.log('[QueueContext] Треки из localStorage успешно загружены');
            } else {
              console.log('[QueueContext] После валидации не осталось корректных треков, загружаем из "Моя музыка"');
              shouldLoadUserTracksRef.current = true;
            }
          } else {
            console.log('[QueueContext] Данные в localStorage некорректны, загружаем треки пользователя');
            shouldLoadUserTracksRef.current = true;
          }
        } catch (parseError) {
          console.error('[QueueContext] Ошибка парсинга данных из localStorage:', parseError);
          shouldLoadUserTracksRef.current = true;
        }
      } else {
        // Отметим, что нужно загрузить треки пользователя
        console.log('[QueueContext] Нет сохраненной очереди в localStorage, загружаем треки пользователя');
        shouldLoadUserTracksRef.current = true;
      }
      
      // Обработка истории воспроизведения
      if (storedHistory) {
        try {
          const parsedHistory = JSON.parse(storedHistory);
          if (Array.isArray(parsedHistory)) {
            setHistory(parsedHistory);
          }
        } catch (error) {
          console.error('[QueueContext] Ошибка при загрузке истории из localStorage:', error);
        }
      }
    } catch (error) {
      console.error('[QueueContext] Общая ошибка при загрузке данных из localStorage:', error);
      // Отметим, что нужно загрузить треки пользователя
      shouldLoadUserTracksRef.current = true;
    }
  }, []);
  
  // Эффект для загрузки треков пользователя, если необходимо
  useEffect(() => {
    if (shouldLoadUserTracksRef.current && queue.length === 0 && !initialDataLoadedRef.current) {
      fetchUserTracks();
      shouldLoadUserTracksRef.current = false;
    }
  }, [queue.length]);
  
  // Дополнительный эффект, который срабатывает один раз при монтировании компонента
  useEffect(() => {
    // Устанавливаем таймер, который проверит наличие треков после всех инициализаций
    const initTimer = setTimeout(() => {
      if (queue.length === 0 && !initialDataLoadedRef.current) {
        console.log('[QueueContext] После инициализации очередь пуста, загружаем треки из "Моя музыка"');
        fetchUserTracks();
        
        // Добавляем повторную попытку через некоторое время, если очередь всё ещё пуста
        const retryTimer = setTimeout(() => {
          if (queue.length === 0 && !initialDataLoadedRef.current && fetchRetryCountRef.current < 2) {
            console.log(`[QueueContext] Повторная попытка загрузки треков (${fetchRetryCountRef.current + 1}/2)`);
            fetchRetryCountRef.current += 1;
            fetchUserTracks();
          }
        }, 3000); // Через 3 секунды пробуем ещё раз
        
        return () => {
          clearTimeout(retryTimer);
        };
      }
    }, 1000); // Даем время другим эффектам выполниться
    
    return () => {
      clearTimeout(initTimer);
    };
  }, []); // Пустой массив зависимостей - эффект выполнится только при монтировании
  
  // Получаем начальные данные из PlayerContext
  useEffect(() => {
    if (initialDataLoadedRef.current) return;

    // Функция для получения начальных данных из PlayerContext
    const initializeFromPlayerContext = () => {
      try {
        // Получаем текущие треки из PlayerContext через window
        if (window.playerContextData) {
          const { tracks, currentTrackIndex } = window.playerContextData;
          
          // Проверяем, есть ли уже треки в очереди
          if (tracks && Array.isArray(tracks) && tracks.length > 0 && queue.length === 0) {
            console.log('[QueueContext] Инициализация данными из PlayerContext, количество треков:', tracks.length);
            setQueue(tracks);
            
            if (currentTrackIndex !== undefined && currentTrackIndex >= 0) {
              setCurrentTrackIndex(currentTrackIndex);
            }
            
            initialDataLoadedRef.current = true;
          }
        }
      } catch (error) {
        console.error('[QueueContext] Ошибка при получении данных из PlayerContext:', error);
      }
    };

    // Подписываемся на событие обновления данных плеера
    const handlePlayerUpdate = (event: CustomEvent) => {
      if (!initialDataLoadedRef.current && event.detail && event.detail.type === 'INITIAL_DATA') {
        const { tracks, currentTrackIndex } = event.detail.data || {};
        
        if (tracks && Array.isArray(tracks) && tracks.length > 0 && queue.length === 0) {
          console.log('[QueueContext] Получены начальные данные из события PlayerContext, треков:', tracks.length);
          setQueue(tracks);
          
          if (currentTrackIndex !== undefined && currentTrackIndex >= 0) {
            setCurrentTrackIndex(currentTrackIndex);
          }
          
          initialDataLoadedRef.current = true;
        }
      }
    };

    // Пытаемся сразу получить данные
    initializeFromPlayerContext();
    
    // Запрашиваем данные из PlayerContext, отправляя событие
    document.dispatchEvent(new CustomEvent('queue_request_data', { detail: { requestId: Date.now() } }));
    
    // Подписываемся на событие обновления данных
    document.addEventListener('player_data_update', handlePlayerUpdate as EventListener);
    
    // Пробуем снова через небольшую задержку, если данные не загрузились
    const retryTimeout = setTimeout(() => {
      if (!initialDataLoadedRef.current) {
        initializeFromPlayerContext();
        // Еще раз запрашиваем данные
        document.dispatchEvent(new CustomEvent('queue_request_data', { detail: { requestId: Date.now() } }));
        
        // Если данные все еще не получены, отмечаем необходимость загрузки треков
        if (queue.length === 0 && !initialDataLoadedRef.current) {
          shouldLoadUserTracksRef.current = true;
        }
      }
    }, 500);
    
    return () => {
      document.removeEventListener('player_data_update', handlePlayerUpdate as EventListener);
      clearTimeout(retryTimeout);
    };
  }, [queue.length]);
  
  // Сохраняем очередь в localStorage при изменении
  useEffect(() => {
    if (queue.length > 0) {
      try {
        console.log(`[QueueContext] Сохранение очереди из ${queue.length} треков в localStorage`);
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
        
        // Если очередь изменилась, но индекс текущего трека выходит за пределы очереди,
        // корректируем его
        if (currentTrackIndex >= queue.length) {
          console.log('[QueueContext] Коррекция индекса текущего трека, т.к. он вышел за пределы очереди');
          setCurrentTrackIndex(Math.max(0, queue.length - 1));
        }
        
        // Отправляем событие об обновлении очереди
        dispatchQueueEvent({
          type: 'QUEUE_UPDATED',
          data: { queue, currentTrackIndex }
        });
      } catch (error) {
        console.error('[QueueContext] Ошибка при сохранении очереди в localStorage:', error);
      }
    } else {
      // Если очередь пуста, и данные еще не были загружены, пытаемся загрузить треки пользователя
      if (!initialDataLoadedRef.current && shouldLoadUserTracksRef.current) {
        console.log('[QueueContext] Очередь пуста после изменения, пробуем загрузить треки пользователя');
        fetchUserTracks();
        shouldLoadUserTracksRef.current = false;
      }
    }
  }, [queue, currentTrackIndex]);
  
  // Сохраняем историю в localStorage при изменении
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_HISTORY_KEY, JSON.stringify(history));
      
      // Отправляем событие об обновлении истории
      dispatchQueueEvent({
        type: 'HISTORY_UPDATED',
        data: { history }
      });
    } catch (error) {
      console.error('[QueueContext] Ошибка при сохранении истории в localStorage:', error);
    }
  }, [history]);
  
  // Функция для создания перемешанной очереди
  const generateShuffledQueue = useCallback((): Track[] => {
    if (originalQueue.length === 0) return [];
    
    console.log('[QueueContext] Генерация перемешанной очереди, треков:', originalQueue.length);
    
    // Создаем копию оригинальной очереди
    const shuffled = [...originalQueue];
    
    // Находим текущий трек
    const currentTrack = currentTrackIndex >= 0 ? originalQueue[currentTrackIndex] : null;
    
    // Убираем текущий трек из массива для перемешивания (если он есть)
    let currentTrackRemoved = null;
    if (currentTrack) {
      const currentIndex = shuffled.findIndex(t => t.id === currentTrack.id);
      if (currentIndex !== -1) {
        currentTrackRemoved = shuffled.splice(currentIndex, 1)[0];
      }
    }
    
    // Перемешиваем массив (улучшенный алгоритм Фишера-Йейтса)
    for (let i = shuffled.length - 1; i > 0; i--) {
      // Используем криптографически более надежный источник случайности, если доступен
      let j;
      if (window.crypto && window.crypto.getRandomValues) {
        const randomArray = new Uint32Array(1);
        window.crypto.getRandomValues(randomArray);
        j = randomArray[0] % (i + 1);
      } else {
        j = Math.floor(Math.random() * (i + 1));
      }
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Проверяем, что перемешивание действительно произошло
    let changesCount = 0;
    for (let i = 0; i < originalQueue.length; i++) {
      if (i < shuffled.length && originalQueue[i].id !== shuffled[i].id) {
        changesCount++;
      }
    }
    
    // Если перемешивание недостаточное (менее 50% изменений), повторяем процесс
    if (changesCount < Math.floor(shuffled.length / 2) && shuffled.length > 3) {
      console.log('[QueueContext] Недостаточное перемешивание, повторная попытка');
      // Рекурсивно вызываем функцию, но не более одного раза во избежание бесконечной рекурсии
      return generateShuffledQueue();
    }
    
    // Если у нас был текущий трек, добавляем его в начало
    if (currentTrackRemoved) {
      shuffled.unshift(currentTrackRemoved);
    }
    
    console.log('[QueueContext] Сгенерирована перемешанная очередь:', 
      shuffled.map(t => t.title).slice(0, 5), 
      `(изменено ${changesCount} треков из ${originalQueue.length})`
    );
    return shuffled;
  }, [originalQueue, currentTrackIndex]);
  
  // Функция для применения перемешанной очереди
  const applyShuffleMode = useCallback((enable: boolean) => {
    console.log(`[QueueContext] Применение режима перемешивания: ${enable ? 'включение' : 'выключение'}, tracks=${queue.length}, originalQueue=${originalQueue.length}`);
    
    if (enable) {
      // Включение режима перемешивания
      if (originalQueue.length === 0 || originalQueue.length !== queue.length) {
        // Если оригинальная очередь пуста или не синхронизирована с текущей, 
        // сохраняем текущую очередь как оригинальную
        console.log('[QueueContext] Сохранение текущей очереди как оригинальной перед перемешиванием');
        setOriginalQueue([...queue]);
        
        // Генерируем перемешанную очередь с паузой для обновления originalQueue
        setTimeout(() => {
          const shuffledQueue = generateShuffledQueue();
          console.log('[QueueContext] Установка перемешанной очереди, треков:', shuffledQueue.length);
          
          // Устанавливаем новую перемешанную очередь
          setQueue(shuffledQueue);
          
          // Обновляем индекс текущего трека после перемешивания
          if (currentTrackIndex >= 0) {
            const currentTrack = queue[currentTrackIndex];
            const newIndex = shuffledQueue.findIndex(t => t.id === currentTrack.id);
            if (newIndex !== -1 && newIndex !== currentTrackIndex) {
              console.log(`[QueueContext] Обновление индекса текущего трека после перемешивания: ${currentTrackIndex} -> ${newIndex}`);
              setCurrentTrackIndex(newIndex);
            }
          }
        }, 0);
      } else {
        // Уже есть сохраненная оригинальная очередь, генерируем перемешанную
        console.log('[QueueContext] Генерация перемешанной очереди с сохраненной оригинальной');
        const shuffledQueue = generateShuffledQueue();
        console.log('[QueueContext] Установка перемешанной очереди, треков:', shuffledQueue.length);
        setQueue(shuffledQueue);
        
        // Обновляем индекс текущего трека
        if (currentTrackIndex >= 0) {
          const currentTrack = originalQueue[currentTrackIndex];
          const newIndex = shuffledQueue.findIndex(t => t.id === currentTrack.id);
          if (newIndex !== -1) {
            console.log(`[QueueContext] Обновление индекса текущего трека после перемешивания: ${currentTrackIndex} -> ${newIndex}`);
            setCurrentTrackIndex(newIndex);
          }
        }
      }
    } else {
      // Выключение режима shuffle - возвращаем оригинальную очередь
      if (originalQueue.length > 0) {
        console.log('[QueueContext] Восстановление оригинальной очереди, треков:', originalQueue.length);
        
        // Сохраняем текущий трек, чтобы найти его в оригинальной очереди
        const currentTrack = currentTrackIndex >= 0 ? queue[currentTrackIndex] : null;
        
        // Возвращаем оригинальную очередь
        setQueue([...originalQueue]);
        
        // Обновляем индекс текущего трека
        if (currentTrack) {
          const newIndex = originalQueue.findIndex(t => t.id === currentTrack.id);
          if (newIndex !== -1) {
            console.log(`[QueueContext] Обновление индекса после восстановления: ${currentTrackIndex} -> ${newIndex}`);
            setCurrentTrackIndex(newIndex);
          }
        }
      } else {
        console.warn('[QueueContext] Попытка выключить режим shuffle, но оригинальная очередь пуста');
      }
    }
    
    // Обновляем флаг режима shuffle
    setShuffleMode(enable);
    
    // Отправляем событие о новом состоянии
    dispatchQueueEvent({
      type: 'SHUFFLE_MODE_CHANGED',
      data: { shuffleMode: enable }
    });
    
    // Возвращаем результат успешного применения режима
    return true;
  }, [queue, originalQueue, currentTrackIndex, generateShuffledQueue]);
  
  // Переключение режима перемешивания
  const toggleShuffleMode = useCallback(() => {
    const newShuffleMode = !shuffleMode;
    console.log(`[QueueContext] Переключение режима перемешивания: ${newShuffleMode ? 'включение' : 'выключение'}`);
    console.log(`[QueueContext] Текущее состояние очереди: queue=${queue.length}, originalQueue=${originalQueue.length}`);
    
    // Если включаем режим и оригинальная очередь не синхронизирована с текущей, обновляем её
    if (newShuffleMode && (originalQueue.length === 0 || originalQueue.length !== queue.length)) {
      console.log('[QueueContext] Обновление оригинальной очереди перед применением shuffle');
      setOriginalQueue([...queue]);
      
      // Небольшая задержка для гарантии обновления состояния
      setTimeout(() => {
        const success = applyShuffleMode(true);
        console.log(`[QueueContext] Результат применения режима shuffle: ${success ? 'успешно' : 'ошибка'}`);
        
        // Отправляем событие о новом состоянии для синхронизации
        dispatchQueueEvent({
          type: 'SHUFFLE_MODE_CHANGED',
          data: { shuffleMode: true }
        });
      }, 50);
    } else {
      // Если выключаем режим или оригинальная очередь уже актуальна
      setTimeout(() => {
        const success = applyShuffleMode(newShuffleMode);
        console.log(`[QueueContext] Результат применения режима shuffle: ${success ? 'успешно' : 'ошибка'}`);
        
        // Отправляем событие о новом состоянии для синхронизации
        dispatchQueueEvent({
          type: 'SHUFFLE_MODE_CHANGED',
          data: { shuffleMode: newShuffleMode }
        });
      }, 0);
    }
  }, [shuffleMode, applyShuffleMode, queue, originalQueue]);
  
  // Обработчик изменения очереди - синхронизация с оригинальной очередью в определенных случаях
  useEffect(() => {
    // Если режим shuffle выключен, синхронизируем оригинальную очередь
    if (!shuffleMode && queue.length > 0) {
      setOriginalQueue([...queue]);
    }
    
    // Если очередь пуста, но оригинальная очередь есть, также очистим оригинальную
    if (queue.length === 0 && originalQueue.length > 0) {
      setOriginalQueue([]);
    }
  }, [queue, shuffleMode]);
  
  // Добавить трек в очередь
  const addToQueue = useCallback((track: Track) => {
    // Проверяем, есть ли этот трек уже в очереди
    const trackExists = queue.some(t => t.id === track.id);
    
    if (!trackExists) {
      console.log('[QueueContext] Добавление трека в очередь:', track.title);
      
      // Проверяем и устанавливаем audioUrl, если он отсутствует, но есть filename
      let trackToAdd = { ...track };
      if (!trackToAdd.audioUrl && trackToAdd.filename) {
        trackToAdd.audioUrl = `/api/music/file/${trackToAdd.filename}`;
      }
      
      setQueue(prevQueue => {
        const newQueue = [...prevQueue, trackToAdd];
        
        // Отправляем событие о добавлении трека
        dispatchQueueEvent({
          type: 'TRACK_ADDED',
          data: { track: trackToAdd, index: newQueue.length - 1 }
        });
        
        return newQueue;
      });
    } else {
      console.log('[QueueContext] Трек уже существует в очереди:', track.title);
    }
  }, [queue]);
  
  // Добавить несколько треков в очередь
  const addTracksToQueue = useCallback((tracks: Track[]) => {
    if (!tracks || tracks.length === 0) return;
    
    console.log('[QueueContext] Добавление нескольких треков в очередь, количество:', tracks.length);
    
    const tracksToAdd = tracks.map(track => {
      // Проверяем и устанавливаем audioUrl для каждого трека
      if (!track.audioUrl && track.filename) {
        return { ...track, audioUrl: `/api/music/file/${track.filename}` };
      }
      return track;
    });
    
    setQueue(prevQueue => {
      // Фильтруем треки, чтобы избежать дубликатов в очереди
      const filteredTracks = tracksToAdd.filter(track => 
        !prevQueue.some(existingTrack => existingTrack.id === track.id)
      );
      
      const newQueue = [...prevQueue, ...filteredTracks];
      
      // Отправляем событие об обновлении очереди
      dispatchQueueEvent({
        type: 'QUEUE_UPDATED',
        data: { queue: newQueue, currentTrackIndex }
      });
      
      return newQueue;
    });
  }, [queue, currentTrackIndex]);
  
  // Удалить трек из очереди
  const removeFromQueue = useCallback((trackId: number) => {
    const indexToRemove = queue.findIndex(t => t.id === trackId);
    if (indexToRemove === -1) return;
    
    console.log('[QueueContext] Удаление трека из очереди, id:', trackId);
    
    setQueue(prevQueue => {
      const newQueue = prevQueue.filter(t => t.id !== trackId);
      
      // Если удаляемый трек находится перед текущим, корректируем индекс
      if (indexToRemove < currentTrackIndex) {
        setCurrentTrackIndex(prev => Math.max(0, prev - 1));
      }
      // Если удаляем текущий трек
      else if (indexToRemove === currentTrackIndex) {
        // Если в очереди еще остались треки
        if (newQueue.length > 0) {
          // Используем тот же индекс (он автоматически будет указывать на следующий трек)
          // или последний трек, если удаляется последний элемент
          const newIndex = Math.min(currentTrackIndex, newQueue.length - 1);
          setCurrentTrackIndex(newIndex);
        } else {
          // Если очередь пуста, сбрасываем индекс
          setCurrentTrackIndex(-1);
        }
      }
      
      // Отправляем событие об удалении трека
      dispatchQueueEvent({
        type: 'TRACK_REMOVED',
        data: { trackId, index: indexToRemove }
      });
      
      return newQueue;
    });
  }, [queue, currentTrackIndex]);
  
  // Очистить очередь
  const clearQueue = useCallback(() => {
    console.log('[QueueContext] Очистка очереди');
    setQueue([]);
    setCurrentTrackIndex(-1);
    
    // Отправляем событие об очистке очереди
    dispatchQueueEvent({
      type: 'QUEUE_CLEARED'
    });
  }, []);
  
  // Добавить трек в историю
  const addToHistory = useCallback((track: Track) => {
    if (!track) return;
    
    console.log('[QueueContext] Добавление трека в историю:', track.title);
    
    setHistory(prevHistory => {
      // Если этот трек уже последний в истории, не добавляем дубликат
      if (prevHistory.length > 0 && prevHistory[prevHistory.length - 1].id === track.id) {
        return prevHistory;
      }
      
      // Ограничиваем историю 50 треками
      const newHistory = [...prevHistory, track];
      if (newHistory.length > 50) {
        return newHistory.slice(newHistory.length - 50);
      }
      return newHistory;
    });
  }, []);
  
  // Очистить историю
  const clearHistory = useCallback(() => {
    console.log('[QueueContext] Очистка истории');
    setHistory([]);
  }, []);
  
  // Переместить трек в очереди
  const moveTrack = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= queue.length || toIndex < 0 || toIndex >= queue.length || fromIndex === toIndex) {
      return;
    }
    
    console.log(`[QueueContext] Перемещение трека с позиции ${fromIndex} на позицию ${toIndex}`);
    
    setQueue(prevQueue => {
      const newQueue = [...prevQueue];
      const [movedTrack] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, movedTrack);
      
      // Корректировка currentTrackIndex при перемещении треков
      let newCurrentTrackIndex = currentTrackIndex;
      
      if (currentTrackIndex === fromIndex) {
        // Если перемещаем текущий трек
        newCurrentTrackIndex = toIndex;
      } else if (
        (fromIndex < currentTrackIndex && toIndex >= currentTrackIndex) || 
        (fromIndex > currentTrackIndex && toIndex <= currentTrackIndex)
      ) {
        // Трек перемещен через текущий трек
        const direction = fromIndex < toIndex ? -1 : 1;
        newCurrentTrackIndex = currentTrackIndex + direction;
      }
      
      if (newCurrentTrackIndex !== currentTrackIndex) {
        setCurrentTrackIndex(newCurrentTrackIndex);
      }
      
      // Отправляем событие об обновлении очереди
      dispatchQueueEvent({
        type: 'QUEUE_UPDATED',
        data: { queue: newQueue, currentTrackIndex: newCurrentTrackIndex }
      });
      
      return newQueue;
    });
  }, [queue, currentTrackIndex]);
  
  // Заменить очередь полностью
  const replaceQueue = useCallback((tracks: Track[]) => {
    console.log('[QueueContext] Замена очереди, новое количество треков:', tracks.length);
    setQueue(tracks);
    
    // Если в новой очереди есть треки, устанавливаем текущий индекс на 0
    if (tracks.length > 0) {
      setCurrentTrackIndex(0);
    } else {
      setCurrentTrackIndex(-1);
    }
  }, []);
  
  // Получить индекс следующего трека с учетом режима shuffle
  const getNextTrackIndex = useCallback((): number => {
    if (queue.length === 0 || currentTrackIndex === -1) {
      return -1; // Нет треков или текущий трек не установлен
    }
    
    // В режиме перемешивания или без него, просто берем следующий индекс
    // Текущая рабочая очередь уже содержит либо оригинальную, либо перемешанную очередь
    const nextIndex = currentTrackIndex + 1;
    return nextIndex < queue.length ? nextIndex : -1;
  }, [queue.length, currentTrackIndex]);
  
  // Получить следующий трек с учетом режима shuffle
  const getNextTrack = useCallback((): Track | null => {
    const nextIndex = getNextTrackIndex();
    if (nextIndex === -1) {
      return null;
    }
    return queue[nextIndex];
  }, [queue, getNextTrackIndex]);
  
  // Получить индекс предыдущего трека с учетом режима shuffle
  const getPrevTrackIndex = useCallback((): number => {
    if (queue.length === 0 || currentTrackIndex === -1) {
      return -1; // Нет треков или текущий трек не установлен
    }
    
    // В режиме перемешивания или без него, просто берем предыдущий индекс
    // Текущая рабочая очередь уже содержит либо оригинальную, либо перемешанную очередь
    return currentTrackIndex > 0 ? currentTrackIndex - 1 : -1;
  }, [queue.length, currentTrackIndex]);
  
  // Получить предыдущий трек с учетом режима shuffle и истории
  const getPreviousTrack = useCallback((): Track | null => {
    // Сначала проверяем историю, если она есть
    if (history.length > 1) {
      // Берем предпоследний трек из истории, так как последний - это текущий трек
      return history[history.length - 2] || null;
    }
    
    // Если истории нет, используем индекс предыдущего трека
    const prevIndex = getPrevTrackIndex();
    if (prevIndex === -1) {
      return null;
    }
    
    return queue[prevIndex];
  }, [history, queue, getPrevTrackIndex]);
  
  // Получить текущий трек
  const getCurrentTrack = useCallback((): Track | null => {
    if (currentTrackIndex < 0 || currentTrackIndex >= queue.length) {
      return null;
    }
    return queue[currentTrackIndex];
  }, [queue, currentTrackIndex]);
  
  // Получить трек по индексу
  const getTrackByIndex = useCallback((index: number): Track | null => {
    if (index < 0 || index >= queue.length) {
      return null;
    }
    return queue[index];
  }, [queue]);

  // Обновим handlePlayerEvents для обработки всех типов событий
  const handlePlayerEvents = (event: CustomEvent) => {
    if (!event.detail) return;

    const { type, data } = event.detail;
    console.log('[QueueContext] Получено событие от PlayerContext:', type);
    
    switch (type) {
      case 'TRACK_PLAYED':
        if (data && data.track) {
          console.log('[QueueContext] Обработка события воспроизведения трека:', data.track.title);
          
          // Проверяем, есть ли этот трек в очереди
          const trackIndex = queue.findIndex(t => t.id === data.track.id);
          
          if (trackIndex !== -1) {
            // Если трек уже в очереди, просто обновляем текущий индекс
            setCurrentTrackIndex(trackIndex);
          } else {
            // Если трека нет в очереди, добавляем его и устанавливаем как текущий
            setQueue(prevQueue => {
              const newQueue = [...prevQueue, data.track];
              setCurrentTrackIndex(newQueue.length - 1);
              return newQueue;
            });
          }
          
          // Добавляем трек в историю
          addToHistory(data.track);
          
          // В режиме shuffle может потребоваться обновить перемешанную очередь
          if (shuffleMode) {
            setTimeout(() => applyShuffleMode(true), 0);
          }
        }
        break;
        
      case 'TRACK_ADDED':
        if (data && data.track) {
          console.log('[QueueContext] Обработка события добавления трека:', data.track.title);
          
          // Добавляем трек в очередь, если его там еще нет
          const trackExists = queue.some(t => t.id === data.track.id);
          if (!trackExists) {
            setQueue(prevQueue => [...prevQueue, data.track]);
            
            // Если режим shuffle активен, применяем перемешивание
            if (shuffleMode) {
              setTimeout(() => applyShuffleMode(true), 0);
            }
          }
        }
        break;
        
      case 'TRACK_REMOVED':
        if (data && data.trackId) {
          console.log('[QueueContext] Обработка события удаления трека, id:', data.trackId);
          
          // Удаляем трек из очереди
          const indexToRemove = queue.findIndex(t => t.id === data.trackId);
          if (indexToRemove !== -1) {
            setQueue(prevQueue => {
              const newQueue = prevQueue.filter(t => t.id !== data.trackId);
              
              // Если удаляем текущий трек, корректируем индекс
              if (indexToRemove === currentTrackIndex) {
                if (newQueue.length > 0) {
                  const newIndex = Math.min(currentTrackIndex, newQueue.length - 1);
                  setCurrentTrackIndex(newIndex);
                } else {
                  setCurrentTrackIndex(-1);
                }
              } else if (indexToRemove < currentTrackIndex) {
                setCurrentTrackIndex(prev => prev - 1);
              }
              
              return newQueue;
            });
            
            // Если режим shuffle активен, применяем перемешивание
            if (shuffleMode) {
              setTimeout(() => applyShuffleMode(true), 0);
            }
          }
        }
        break;
        
      case 'QUEUE_CLEARED':
        console.log('[QueueContext] Обработка события очистки очереди');
        setQueue([]);
        setCurrentTrackIndex(-1);
        // Здесь можно автоматически загрузить треки пользователя
        if (!initialDataLoadedRef.current) {
          setTimeout(() => {
            fetchUserTracks();
          }, 300);
        }
        break;
        
      case 'INITIAL_DATA':
        if (!initialDataLoadedRef.current && data && data.tracks && data.tracks.length > 0) {
          console.log('[QueueContext] Обработка события с начальными данными, треков:', data.tracks.length);
          setQueue(data.tracks);
          
          if (data.currentTrackIndex !== undefined && data.currentTrackIndex >= 0) {
            setCurrentTrackIndex(data.currentTrackIndex);
          }
          
          // Если пришли данные с shuffleMode, учитываем их
          if (data.shuffleMode !== undefined) {
            // Если shuffle активен, применяем перемешивание, иначе просто сохраняем значение
            if (data.shuffleMode) {
              // Сначала сохраняем оригинальную очередь
              setOriginalQueue([...data.tracks]);
              applyShuffleMode(true);
            } else {
              setShuffleMode(false);
            }
          }
          
          initialDataLoadedRef.current = true;
        } else if (!initialDataLoadedRef.current && (!data || !data.tracks || data.tracks.length === 0) && queue.length === 0) {
          // Если получили пустые начальные данные, и очередь пуста, загружаем треки пользователя
          console.log('[QueueContext] Получены пустые начальные данные, загружаем треки пользователя');
          fetchUserTracks();
        }
        break;
        
      case 'QUEUE_EMPTY':
        // Обработка события пустой очереди
        if (queue.length === 0 && !initialDataLoadedRef.current) {
          console.log('[QueueContext] Получено событие пустой очереди, загружаем треки пользователя');
          fetchUserTracks();
        }
        break;
        
      case 'TOGGLE_SHUFFLE':
        // Включение/выключение режима перемешивания
        console.log('[QueueContext] Обработка события переключения режима перемешивания');
        if (data && data.shuffleMode !== undefined) {
          console.log('[QueueContext] Установка режима перемешивания из события TOGGLE_SHUFFLE:', data.shuffleMode, 
                     'принудительное обновление:', data.forceGenerate);
          
          // Если требуется принудительное обновление, сбрасываем оригинальную очередь
          // для гарантии перегенерации
          if (data.forceGenerate && data.shuffleMode) {
            console.log('[QueueContext] Принудительное обновление очереди (сброс оригинальной)');
            if (queue.length > 0) {
              setOriginalQueue([...queue]);
            }
          }
          
          // Применяем перемешивание
          applyShuffleMode(data.shuffleMode);
        } else {
          // Если не указан конкретный режим, переключаем текущий
          applyShuffleMode(!shuffleMode);
        }
        break;
        
      case 'SET_SHUFFLE_MODE':
        // Установка конкретного значения режима перемешивания
        if (data && data.shuffleMode !== undefined) {
          console.log('[QueueContext] Установка режима перемешивания:', data.shuffleMode, 
                     'принудительное обновление:', data.forceGenerate);
          
          // Применяем перемешивание
          applyShuffleMode(data.shuffleMode);
        }
        break;
        
      default:
        console.log('[QueueContext] Неизвестный тип события:', type);
    }
  };

  // Слушатель событий для обработки воспроизведения треков из PlayerContext
  useEffect(() => {
    // Подписываемся на события от PlayerContext
    document.addEventListener('player_event', handlePlayerEvents as EventListener);
    
    return () => {
      document.removeEventListener('player_event', handlePlayerEvents as EventListener);
    };
  }, [
    queue, 
    currentTrackIndex, 
    addToHistory, 
    fetchUserTracks, 
    initialDataLoadedRef.current, 
    shuffleMode, 
    applyShuffleMode
  ]);

  // Обновление перемешанной очереди при изменении основной очереди
  useEffect(() => {
    // Если режим перемешивания активен, а очередь изменилась,
    // нужно перегенерировать перемешанную очередь
    if (shuffleMode && queue.length > 0) {
      console.log('[QueueContext] Обновление перемешанной очереди из-за изменения основной очереди');
      applyShuffleMode(true);
    }
  }, [queue, shuffleMode, applyShuffleMode]);

  // Установить индекс текущего трека
  const updateCurrentTrackIndex = useCallback((index: number) => {
    if (index < 0 || index >= queue.length) {
      console.warn(`[QueueContext] Попытка установить некорректный индекс трека: ${index}, максимальный индекс: ${queue.length - 1}`);
      return;
    }
    
    console.log(`[QueueContext] Установка текущего индекса трека: ${index}`);
    setCurrentTrackIndex(index);
  }, [queue.length]);

  // Значение контекста
  const contextValue: QueueContextProps = {
    queue,
    originalQueue,
    history,
    currentTrackIndex,
    shuffleMode,
    addToQueue,
    addTracksToQueue,
    removeFromQueue,
    clearQueue,
    addToHistory,
    clearHistory,
    moveTrack,
    setCurrentTrackIndex: updateCurrentTrackIndex,
    replaceQueue,
    getNextTrack,
    getPreviousTrack,
    getCurrentTrack,
    getTrackByIndex,
    fetchUserTracks,
    toggleShuffleMode,
    applyShuffleMode
  };
  
  return (
    <QueueContext.Provider value={contextValue}>
      {children}
    </QueueContext.Provider>
  );
};

// Хук для использования контекста очереди
export const useQueue = (): QueueContextProps => {
  const context = useContext(QueueContext);
  if (context === undefined) {
    throw new Error('useQueue должен использоваться внутри QueueProvider');
  }
  return context;
}; 