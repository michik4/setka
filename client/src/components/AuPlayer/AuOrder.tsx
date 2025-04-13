import React, { useState } from 'react';
import styles from './AuOrder.module.css';
import { Track } from '../../types/music.types';
import { usePlayer } from '../../contexts/PlayerContext';

// Константа для обложки по умолчанию
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

interface AuOrderProps {
    tracks: Track[];
    currentTrackIndex: number;
    onSelectTrack: (index: number) => void;
    onDeleteTrack: (trackId: number) => void;
    expandedMode?: boolean;
}

const AuOrder = ({ tracks, currentTrackIndex, onSelectTrack, onDeleteTrack, expandedMode = false }: AuOrderProps) => {
    const { getTrackCover, isPlaying } = usePlayer();
    const [coverErrors, setCoverErrors] = useState<Record<number, boolean>>({});

    // Обработчик ошибки загрузки обложки
    const handleCoverError = (trackId: number) => {
        setCoverErrors(prev => ({ ...prev, [trackId]: true }));
    };

    return (
        <div className={`${styles.auOrder} ${expandedMode ? styles.expandedMode : ''}`}>
            {tracks.map((track, index) => {
                // Определяем URL обложки с учетом возможных ошибок
                const isCurrentTrack = index === currentTrackIndex;
                
                // Используем getTrackCover для правильного формирования пути к обложке
                const coverUrl = coverErrors[track.id] 
                    ? DEFAULT_COVER_URL 
                    : getTrackCover(track.coverUrl);
                
                return (
                    <div 
                        key={track.id} 
                        className={`${styles.auOrderTrack} ${isCurrentTrack ? styles.activeTrack : ''}`}
                        onClick={() => onSelectTrack(index)}
                    >
                        <div className={styles.auOrderTrackLeft}>
                            <div className={styles.auOrderTrackImage}>
                                <img 
                                    src={coverUrl} 
                                    alt={track.title} 
                                    onError={() => handleCoverError(track.id)}
                                />
                                {isCurrentTrack && isPlaying ? (
                                    <div className={styles.playingOverlay}>
                                        <div className={styles.playingIcon}>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                            <span></span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.playOverlay}>
                                        <div className={styles.pausedIcon}>
                                            <svg viewBox="0 0 24 24" width="24" height="24" fill="white">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className={styles.auOrderTrackInfo}>
                                <div className={styles.auOrderTitle}>
                                    {track.title}
                                </div>
                                <div className={styles.auOrderArtist}>
                                    {track.artist}
                                </div>
                            </div>
                        </div>
                        <div className={styles.auOrderTrackRight}>
                            <div className={styles.auOrderTrackDuration}>
                                {track.duration}
                            </div>
                            <button 
                                className={styles.deleteButton} 
                                onClick={(e) => { 
                                    e.stopPropagation();
                                    onDeleteTrack(track.id);
                                }}
                                title="Удалить из очереди"
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                    <path d="M19 13H5v-2h14v2z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AuOrder;
