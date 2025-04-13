import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { usePlayer } from './PlayerContext';

// Интерфейс для контекста отдельного окна плеера
interface PlayerWindowContextProps {
  lastSeekTime: number;
  isControlActive: boolean;
  setLastSeekTime: (time: number) => void;
  setIsControlActive: (active: boolean) => void;
  optimizeOperation: <T>(callback: () => T, preventReload?: boolean) => T;
}

// Создаем контекст
const PlayerWindowContext = createContext<PlayerWindowContextProps | undefined>(undefined);

// Провайдер контекста
export const PlayerWindowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { audio, isMasterPlayer, becomeMasterPlayer } = usePlayer();
  const [lastSeekTime, setLastSeekTime] = useState<number>(0);
  const [isControlActive, setIsControlActive] = useState<boolean>(false);
  const controlTimerRef = useRef<NodeJS.Timeout | null>(null);
  const operationInProgressRef = useRef<boolean>(false);
  const [playerState, setPlayerState] = useState({ position: 0, isPlaying: false, trackId: '', timestamp: 0 });

  // Функция для оптимизированного выполнения операций с плеером
  const optimizeOperation = <T,>(callback: () => T, preventReload = true): T => {
    // Отмечаем, что операция началась
    operationInProgressRef.current = true;
    
    // Устанавливаем флаг активного управления
    setIsControlActive(true);
    
    // Если не являемся мастером, становимся им
    if (!isMasterPlayer && audio) {
      becomeMasterPlayer();
    }
    
    // Если нужно предотвратить перезагрузку, приостанавливаем события
    if (preventReload && audio) {
      // Сохраняем текущие обработчики и состояние
      const currentSrc = audio.src;
      const currentTime = audio.currentTime;
      const wasPlaying = !audio.paused;
      
      // Запоминаем оригинальные обработчики
      const originalOnProgress = audio.onprogress;
      const originalOnLoadStart = audio.onloadstart;
      const originalOnLoadedData = audio.onloadeddata;
      
      // Предотвращаем автоматические запросы к серверу за счет блокировки событий загрузки
      audio.onprogress = null;
      audio.onloadstart = null;
      audio.onloadeddata = null;
      
      try {
        // Выполняем операцию
        const result = callback();
        
        // Проверяем, изменился ли источник
        if (audio.src !== currentSrc) {
          // Источник изменился, что означает смену трека
          // Разрешаем нормальную загрузку нового трека
        } else {
          // Источник не изменился, контролируем состояние текущего трека
          
          // Проверяем действительно ли изменилось время (для перемотки)
          if (Math.abs(audio.currentTime - currentTime) > 0.5) {
            // Реальная перемотка произошла, обрабатываем
          }
          
          // Восстанавливаем воспроизведение, только если оно было активно до операции
          if (wasPlaying && audio.paused && audio.readyState >= 2) {
            // Используем setTimeout для предотвращения слишком быстрого вызова play()
            setTimeout(() => {
              if (audio && audio.paused && audio.readyState >= 2) {
                audio.play().catch(() => {});
              }
            }, 100);
          }
        }
        
        return result;
      } finally {
        // Восстанавливаем обработчики в любом случае
        audio.onprogress = originalOnProgress;
        audio.onloadstart = originalOnLoadStart;
        audio.onloadeddata = originalOnLoadedData;
        
        // Очищаем флаг операции
        operationInProgressRef.current = false;
      }
    } else {
      try {
        // Выполняем операцию без оптимизаций
        return callback();
      } finally {
        // Очищаем флаг операции
        operationInProgressRef.current = false;
      }
    }
  };

  // Автоматическое снятие флага активного управления
  useEffect(() => {
    if (isControlActive) {
      // Сбрасываем предыдущий таймер, если он есть
      if (controlTimerRef.current) {
        clearTimeout(controlTimerRef.current);
      }
      
      // Устанавливаем новый таймер
      controlTimerRef.current = setTimeout(() => {
        if (!operationInProgressRef.current) {
          setIsControlActive(false);
        }
      }, 1000); // Через 1 секунду после последнего действия
    }
    
    return () => {
      if (controlTimerRef.current) {
        clearTimeout(controlTimerRef.current);
      }
    };
  }, [isControlActive, lastSeekTime]);

  // Обработчик событий аудио для оптимизации
  useEffect(() => {
    if (!audio) return;
    
    const handleAudioEvents = (e: Event) => {
      // Только если активен контроль, подавляем стандартное поведение
      if (isControlActive && operationInProgressRef.current) {
        e.stopPropagation();
      }
    };
    
    // Подписываемся на события
    const criticalEvents = ['play', 'pause', 'seeking', 'seeked', 'emptied', 'loadstart'];
    criticalEvents.forEach(eventName => {
      audio.addEventListener(eventName, handleAudioEvents, { capture: true });
    });
    
    return () => {
      criticalEvents.forEach(eventName => {
        audio.removeEventListener(eventName, handleAudioEvents, { capture: true });
      });
    };
  }, [audio, isControlActive]);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'player_window_closed') {
        const closedTimestamp = parseInt(e.newValue || '0');
        const openedTimestamp = parseInt(localStorage.getItem('player_window_opened') || '0');
        
        if (closedTimestamp > openedTimestamp) {
          // При закрытии окна сохраняем текущее состояние
          const state = {
            position: audio.currentTime,
            isPlaying: false,
            trackId: audio.src,
            timestamp: Date.now()
          };
          localStorage.setItem('player_window_state', JSON.stringify(state));
          setIsControlActive(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [audio]);

  // Восстановление состояния при открытии окна
  useEffect(() => {
    const savedState = localStorage.getItem('player_window_state');
    if (savedState && audio) {
      const state = JSON.parse(savedState);
      if (state.trackId === audio.src) {
        audio.currentTime = state.position;
      }
    }
  }, [audio]);
  
  return (
    <PlayerWindowContext.Provider
      value={{
        lastSeekTime,
        isControlActive,
        setLastSeekTime,
        setIsControlActive,
        optimizeOperation
      }}
    >
      {children}
    </PlayerWindowContext.Provider>
  );
};

// Хук для использования контекста
export const usePlayerWindow = (): PlayerWindowContextProps => {
  const context = useContext(PlayerWindowContext);
  if (context === undefined) {
    throw new Error('usePlayerWindow должен использоваться внутри PlayerWindowProvider');
  }
  return context;
}; 