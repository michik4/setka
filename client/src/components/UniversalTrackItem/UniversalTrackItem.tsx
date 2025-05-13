import React, { useState, useEffect } from 'react';
import { Track } from '../../types/music.types';
import { DEFAULT_COVER_URL } from '../../config/constants';
import { usePlayer } from '../../contexts/PlayerContext';
import { useQueue } from '../../contexts/QueueContext';
import { MusicService } from '../../services/music.service';
import styles from './UniversalTrackItem.module.css';
import { LibraryAdd, LibraryAddCheck, Pause as PauseIcon, PlayArrow as PlayArrowIcon, ViewList } from '@mui/icons-material';

interface UniversalTrackItemProps {
    track: Track;
    index?: number;
    variant?: 'default' | 'compact' | 'post' | 'album' | 'queue';
    isInLibrary?: boolean;
    onLibraryStatusChange?: () => void;
    className?: string;
    onPlayClick?: () => void;
}

const UniversalTrackItem: React.FC<UniversalTrackItemProps> = ({
    track,
    index,
    variant = 'default',
    isInLibrary = false,
    onLibraryStatusChange,
    className = '',
    onPlayClick
}) => {
    const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
    const { addToQueue } = useQueue();
    const [isInLib, setIsInLib] = useState(isInLibrary);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // Обновляем локальное состояние, если изменились пропсы
    useEffect(() => {
        setIsInLib(isInLibrary);
    }, [isInLibrary]);
    
    // Проверка наличия трека в библиотеке при монтировании компонента
    useEffect(() => {
        // Если isInLibrary явно задан через пропсы, не делаем запрос
        if (isInLibrary !== undefined && isInLibrary !== null) {
            return;
        }
        
        // Проверяем наличие ID для запроса
        if (!track || !track.id) {
            console.error('Невозможно проверить наличие трека в библиотеке: отсутствует ID трека');
            return;
        }
        
        const checkTrackInLibrary = async () => {
            try {
                const isInLibrary = await MusicService.isTrackInLibrary(track.id);
                setIsInLib(isInLibrary);
            } catch (error) {
                console.error('Ошибка при проверке наличия трека в библиотеке:', error);
            }
        };
        
        checkTrackInLibrary();
    }, [track?.id, isInLibrary]);
    
    const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
    const isSelected = currentTrack?.id === track.id;
    
    const handlePlayClick = () => {
        if (onPlayClick) {
            onPlayClick();
            return;
        }
        
        if (isSelected) {
            togglePlay();
        } else {
            playTrack(track);
        }
    };
    
    const handleLibraryAction = async () => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        try {
            if (isInLib) {
                // Удаляем из библиотеки
                await MusicService.removeTrackFromLibrary(track.id);
                setIsInLib(false);
            } else {
                // Добавляем в библиотеку
                await MusicService.addTrackToLibrary(track.id);
                setIsInLib(true);
            }
            
            // Уведомляем родителя об изменении статуса
            if (onLibraryStatusChange) {
                onLibraryStatusChange();
            }
        } catch (error) {
            console.error(`Ошибка при ${isInLib ? 'удалении из' : 'добавлении в'} библиотеку:`, error);
            alert(`Не удалось ${isInLib ? 'удалить трек из' : 'добавить трек в'} библиотеку. Пожалуйста, попробуйте ещё раз.`);
        } finally {
            setIsProcessing(false);
        }
    };
    
    const handleAddToQueueClick = () => {
        addToQueue(track);
    };
    
    const formatDuration = (duration: string) => {
        const parts = duration.split(':');
        if (parts.length === 2) {
            return duration; // Если формат уже MM:SS
        }
        if (parts.length === 3) {
            const [hours, minutes, seconds] = parts;
            if (hours === '00') {
                return `${minutes}:${seconds}`; // Если часы = 0, возвращаем MM:SS
            }
            return duration; // Иначе возвращаем как есть
        }
        return duration; // Возвращаем исходный формат, если не удалось распознать
    };
    
    // Определяем классы в зависимости от варианта отображения
    const trackItemClass = `${styles.trackItem} ${styles[variant]} 
                          ${isSelected ? styles.selected : ''} 
                          ${isCurrentlyPlaying ? styles.playing : ''} 
                          ${className}`.trim();

    // Определяем показывать ли обложку в зависимости от варианта
    const showCover = variant !== 'compact';
    // Определяем показывать ли исполнителя в зависимости от варианта
    const showArtist = variant !== 'compact';
    // Определяем показывать ли длительность в зависимости от варианта
    const showDuration = variant !== 'compact' && variant !== 'post';
    
    return (
        <div className={trackItemClass}>
            {index !== undefined && (
                <div className={styles.trackIndex}>{index}</div>
            )}
            
            {showCover && (
                <button 
                    className={styles.trackCoverButton}
                    onClick={handlePlayClick}
                    title={isCurrentlyPlaying ? 'Пауза' : 'Воспроизвести'}
                >
                    <div className={styles.trackCover}>
                        <img 
                            src={track.coverUrl || DEFAULT_COVER_URL} 
                            alt={track.title}
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COVER_URL }} 
                        />
                        {isCurrentlyPlaying && (
                            <div className={styles.playingOverlay}>
                                <span className={styles.playingIndicator}></span>
                            </div>
                        )}
                        {!isCurrentlyPlaying && (
                            <div className={styles.playOverlay}>
                                <PlayArrowIcon className={styles.playIcon} />
                            </div>
                        )}
                    </div>
                </button>
            )}
            
            <div className={styles.trackInfo}>
                <div className={styles.trackTitle}>{track.title}</div>
                {showArtist && (
                    <div className={styles.trackArtist}>{track.artist}</div>
                )}
            </div>
            
            {showDuration && (
                <div className={styles.trackDuration}>
                    {formatDuration(track.duration)}
                </div>
            )}
            
            <div className={styles.trackControls}>
                <button 
                    className={`${styles.trackControlButton} ${isInLib ? styles.inLibrary : ''}`}
                    onClick={handleLibraryAction}
                    disabled={isProcessing}
                    title={isInLib ? 'Удалить из Моей музыки' : 'Добавить в Мою музыку'}
                >
                    {isInLib ? (
                        <LibraryAddCheck />
                    ) : (
                        <LibraryAdd />
                    )}
                </button>
                
                <button 
                    className={styles.trackControlButton}
                    onClick={handleAddToQueueClick}
                    title="Добавить в очередь"
                >
                    <ViewList />
                </button>
            </div>
        </div>
    );
};

export default UniversalTrackItem; 