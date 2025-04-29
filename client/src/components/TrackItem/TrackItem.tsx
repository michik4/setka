import React, { useState } from 'react';
import { Track } from '../../types/music.types';
import { DEFAULT_COVER_URL } from '../../config/constants';
import { usePlayer } from '../../contexts/PlayerContext';
import { MusicService } from '../../services/music.service';
import { useQueue } from '../../contexts/QueueContext';
import styles from './TrackItem.module.css';

interface TrackItemProps {
    track: Track;
    index?: number;
    isInLibrary?: boolean;
    showCover?: boolean;
    showArtist?: boolean;
    showDuration?: boolean;
    showControls?: boolean;
    onRemove?: (trackId: number) => void;
    onAddToQueue?: (track: Track) => void;
    className?: string;
    onLibraryStatusChange?: () => void;
}

const TrackItem: React.FC<TrackItemProps> = ({
    track,
    index,
    isInLibrary = false,
    showCover = true,
    showArtist = true,
    showDuration = true,
    showControls = true,
    onRemove,
    onAddToQueue,
    className = '',
    onLibraryStatusChange
}) => {
    const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
    const { addToQueue } = useQueue();
    const [isInLib, setIsInLib] = useState(isInLibrary);
    const [isProcessing, setIsProcessing] = useState(false);
    
    const handlePlayClick = () => {
        if (currentTrack?.id === track.id) {
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
        if (onAddToQueue) {
            onAddToQueue(track);
        } else {
            addToQueue(track);
        }
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
    
    return (
        <div className={`${styles.trackItem} ${currentTrack?.id === track.id ? styles.nowPlaying : ''} ${className}`}>
            {index !== undefined && (
                <div className={styles.trackIndex}>{index}</div>
            )}
            
            {showCover && (
                <div className={styles.trackCover}>
                    <img 
                        src={track.coverUrl || DEFAULT_COVER_URL} 
                        alt={track.title}
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COVER_URL }} 
                    />
                    {currentTrack?.id === track.id && isPlaying && (
                        <div className={styles.playingOverlay}>
                            <span className={styles.playingIndicator}></span>
                        </div>
                    )}
                </div>
            )}
            
            <div className={styles.trackInfo}>
                <div className={styles.trackTitle}>{track.title}</div>
                {showArtist && (
                    <div className={styles.trackArtist}>{track.artist}</div>
                )}
            </div>
            
            {showDuration && (
                <div className={styles.trackDuration}>{formatDuration(track.duration)}</div>
            )}
            
            {showControls && (
                <div className={styles.trackControls}>
                    <button 
                        className={styles.trackControlButton}
                        onClick={handlePlayClick}
                        title={currentTrack?.id === track.id && isPlaying ? 'Пауза' : 'Воспроизвести'}
                    >
                        {currentTrack?.id === track.id && isPlaying ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                                <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 4.99998L19 12L5 19V4.99998Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                            </svg>
                        )}
                    </button>
                    
                    <button 
                        className={styles.trackControlButton}
                        onClick={handleLibraryAction}
                        disabled={isProcessing}
                        title={isInLib ? 'Удалить из Моей музыки' : 'Добавить в Мою музыку'}
                    >
                        {isInLib ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M18 12L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                        )}
                    </button>
                    
                    <button 
                        className={styles.trackControlButton}
                        onClick={handleAddToQueueClick}
                        title="Добавить в очередь"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M3 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M3 18H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M19 15L22 18L19 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                    
                    {onRemove && (
                        <button 
                            className={styles.trackControlButton}
                            onClick={() => onRemove(track.id)}
                            title="Удалить"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default TrackItem; 