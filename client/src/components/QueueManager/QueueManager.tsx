import React, { useState, useRef, useEffect } from 'react';
import { useQueue } from '../../contexts/QueueContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { Track } from '../../types/music.types';
import styles from './QueueManager.module.css';

interface QueueManagerProps {
  isExpanded?: boolean;
}

const QueueManager: React.FC<QueueManagerProps> = ({ isExpanded = false }) => {
  const { 
    queue, 
    history, 
    currentTrackIndex, 
    removeFromQueue, 
    clearQueue, 
    moveTrack 
  } = useQueue();
  
  const { 
    playTrackByIndex,
    isPlaying,
    togglePlay,
    currentTrack
  } = usePlayer();
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState(false);
  
  // Обработчик для начала перетаскивания трека
  const handleDragStart = (index: number, e: React.DragEvent<HTMLDivElement>) => {
    setDraggedIndex(index);
    setIsDragging(true);
    
    // Сохраняем данные для перетаскивания
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
    
    // Добавим эффект непрозрачности для элемента при перетаскивании
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '0.5';
      e.currentTarget.style.transform = 'scale(0.98)';
    }
  };
  
  // Обработчик для завершения перетаскивания
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget) {
      e.currentTarget.style.opacity = '1';
      e.currentTarget.style.transform = '';
    }
    
    // Сбрасываем состояние перетаскивания
    setTimeout(() => {
      setDropIndex(null);
      setIsDragging(false);
      setDraggedIndex(null);
    }, 100);
  };
  
  // Обработчик для перетаскивания трека над другим треком
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault(); // Необходимо для разрешения drop
    e.dataTransfer.dropEffect = 'move';
    
    // Определяем, куда вставлять: перед или после элемента
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY;
    const offsetY = mouseY - rect.top;
    
    if (draggedIndex !== null) {
      let targetIndex = index;
      
      // Если указатель мыши находится в верхней половине элемента,
      // то вставляем перед текущим элементом
      if (offsetY < rect.height / 2) {
        // вставка перед элементом
        targetIndex = index;
      } else {
        // вставка после элемента
        targetIndex = index + 1;
      }
      
      // Корректируем индекс, если перетаскиваем вниз
      if (draggedIndex < targetIndex) {
        targetIndex--;
      }
      
      // Обновляем индекс только если он изменился
      if (dropIndex !== targetIndex) {
        setDropIndex(targetIndex);
      }
    }
  };
  
  // Обработчик при входе в зону элемента
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  // Обработчик при выходе из зоны элемента
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Не сбрасываем dropIndex, чтобы избежать мерцания
  };
  
  // Обработчик для сброса перетаскиваемого трека
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    
    if (draggedIndex !== null && dropIndex !== null && draggedIndex !== dropIndex) {
      // Перемещаем трек ровно на ту позицию, куда указывает dropIndex
      moveTrack(draggedIndex, dropIndex);
    }
    
    // Сбрасываем состояние перетаскивания
    setTimeout(() => {
      setDropIndex(null);
      setIsDragging(false);
      setDraggedIndex(null);
    }, 100);
  };
  
  // Обработчик для сброса в верхнюю позицию (индекс 0)
  const handleDropAtTop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== 0) {
      moveTrack(draggedIndex, 0);
    }
    
    setTimeout(() => {
      setDropIndex(null);
      setIsDragging(false);
      setDraggedIndex(null);
    }, 100);
  };
  
  // Форматирование времени трека
  const formatTime = (timeString: string) => {
    if (!timeString) return '00:00';
    
    // Если время уже в формате MM:SS, просто возвращаем его
    if (/^\d{1,2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Пытаемся преобразовать строку в секунды
    let seconds = 0;
    try {
      seconds = parseInt(timeString);
    } catch (e) {
      return '00:00';
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Рендер трека в очереди
  const renderTrack = (track: Track, index: number, isHistory = false) => {
    const isCurrentTrack = currentTrack && track.id === currentTrack.id;
    const isBeingDragged = draggedIndex === index;
    
    return (
      <React.Fragment key={`track-fragment-${track.id}-${index}`}>
        {/* Плейсхолдер перед треком */}
        {!isHistory && dropIndex === index && draggedIndex !== index && (
          <div className={styles.dropPlaceholder}>
            <div className={styles.placeholderLine}></div>
          </div>
        )}
        
        <div 
          key={`track-${track.id}-${index}`}
          className={`${styles.queueTrack} ${isCurrentTrack ? styles.currentTrack : ''} ${isBeingDragged ? styles.dragging : ''}`}
          draggable={!isHistory}
          onDragStart={(e) => !isHistory && handleDragStart(index, e)}
          onDragEnd={handleDragEnd}
          onDragOver={(e) => !isHistory && handleDragOver(e, index)}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={(e) => !isHistory && handleDrop(e, index)}
          onClick={() => !isHistory && playTrackByIndex(index)}
        >
          <div className={styles.trackDragHandle} title="Перетащите для изменения порядка">
            <span className={styles.dragHandleIcon}>⋮⋮</span>
          </div>
          <div className={styles.trackInfo}>
            <div className={styles.trackCover}>
              <img 
                src={track.coverUrl || '/api/music/cover/default.png'} 
                alt={track.title} 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/api/music/cover/default.png';
                }}
              />
              {isCurrentTrack && (
                <div className={styles.playingIndicator}>
                  {isPlaying ? (
                    <span className={styles.playingIcon}>▶</span>
                  ) : (
                    <span className={styles.pausedIcon}>⏸</span>
                  )}
                </div>
              )}
            </div>
            <div className={styles.trackDetails}>
              <div className={styles.trackTitle}>{track.title}</div>
              <div className={styles.trackArtist}>{track.artist}</div>
            </div>
          </div>
          <div className={styles.trackActions}>
            <span className={styles.trackDuration}>{formatTime(track.duration)}</span>
            {!isHistory && (
              <button 
                className={styles.trackRemove} 
                onClick={(e) => {
                  e.stopPropagation();
                  removeFromQueue(track.id);
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>
        
        {/* Плейсхолдер после последнего трека */}
        {!isHistory && index === queue.length - 1 && dropIndex === index + 1 && (
          <div className={styles.dropPlaceholder}>
            <div className={styles.placeholderLine}></div>
          </div>
        )}
      </React.Fragment>
    );
  };
  
  return (
    <div className={`${styles.queueManager} ${isExpanded ? styles.expanded : ''} ${isDragging ? styles.draggingActive : ''}`}>
      <div className={styles.queueHeader}>
        <div className={styles.queueActions}>
          <button 
            className={`${styles.queueTab} ${!showHistory ? styles.active : ''}`}
            onClick={() => setShowHistory(false)}
          >
            Очередь ({queue.length})
          </button>
          <button 
            className={`${styles.queueTab} ${showHistory ? styles.active : ''}`}
            onClick={() => setShowHistory(true)}
          >
            История ({history.length})
          </button>
          {!showHistory && (
            <button 
              className={styles.clearQueue} 
              onClick={clearQueue}
              disabled={queue.length === 0}
            >
              Очистить
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.queueContent}>
        {!showHistory && queue.length > 0 && (
          <div className={styles.dragDropHint}>
            <span className={styles.dragIconHint}>⋮⋮</span> Перетащите треки для изменения порядка
          </div>
        )}
        
        {showHistory ? (
          history.length > 0 ? (
            <div className={styles.historyList}>
              {history.map((track, index) => renderTrack(track, index, true))}
            </div>
          ) : (
            <div className={styles.emptyList}>История воспроизведения пуста</div>
          )
        ) : (
          queue.length > 0 ? (
            <div className={styles.queueList}>
              {/* Плейсхолдер для перемещения трека в самый верх списка */}
              {dropIndex === 0 && draggedIndex !== 0 && (
                <div 
                  className={styles.dropPlaceholder}
                  onDragOver={(e) => { e.preventDefault(); setDropIndex(0); }}
                  onDragEnter={(e) => { e.preventDefault(); setDropIndex(0); }}
                  onDrop={handleDropAtTop}
                >
                  <div className={styles.placeholderLine}></div>
                </div>
              )}
              
              {queue.map((track, index) => renderTrack(track, index))}
            </div>
          ) : (
            <div className={styles.emptyList}>Очередь воспроизведения пуста</div>
          )
        )}
      </div>
    </div>
  );
};

export default QueueManager; 