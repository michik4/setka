import { useState } from "react";
import { Track } from "../../types/music.types";
import { usePlayer } from "../../contexts/PlayerContext";
import styles from './AuOrder.module.css';

interface AuOrderProps {
    tracks: Track[];
    currentTrackIndex: number;
    onSelectTrack: (index: number) => void;
    onDeleteTrack?: (id: number) => void;
    expandedMode?: boolean;
}

const AuOrder = ({ tracks, currentTrackIndex, onSelectTrack, onDeleteTrack, expandedMode = false }: AuOrderProps) => {
    const { getTrackCover, isPlaying, setIsPlaying } = usePlayer();
    const [coverErrors, setCoverErrors] = useState<Record<number, boolean>>({});
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

    // Обработка ошибки загрузки обложки
    const handleCoverError = (trackId: number) => {
        console.warn('[AuOrder] Ошибка загрузки обложки для трека ID:', trackId);
        setCoverErrors(prev => ({ ...prev, [trackId]: true }));
    };

    // Управление треками при клике
    const handleTrackClick = (index: number) => {
        if (index === currentTrackIndex) {
            // Если трек уже активен, переключаем воспроизведение/паузу
            setIsPlaying(!isPlaying);
        } else {
            // Если выбран другой трек, запускаем его воспроизведение
            onSelectTrack(index);
        }
    };
    
    // Обработчик нажатия на кнопку удаления
    const handleDeleteClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation(); // Предотвращаем всплытие события
        
        if (deleteConfirm === id) {
            // Если уже нажали на удаление этого трека, выполняем удаление
            if (onDeleteTrack) {
                onDeleteTrack(id);
            }
            setDeleteConfirm(null);
        } else {
            // Первое нажатие - запрашиваем подтверждение
            setDeleteConfirm(id);
            
            // Сбрасываем подтверждение через 3 секунды
            setTimeout(() => {
                setDeleteConfirm(null);
            }, 3000);
        }
    };

    return (
        <div className={`${styles.auOrder} ${expandedMode ? styles.expandedMode : ''}`}>
            {tracks.map((track, index) => {
                // Определяем URL обложки с учетом возможных ошибок
                const coverUrl = coverErrors[track.id] ? '/default-cover.jpg' : getTrackCover(track.coverUrl);
                
                return (
                    <div 
                        className={`${styles.auOrderTrack} ${index === currentTrackIndex ? styles.activeTrack : ''}`} 
                        key={track.id}
                        onClick={() => handleTrackClick(index)}
                    >
                        <div className={styles.auOrderTrackLeft}>
                            <div className={styles.auOrderTrackImage}>
                                <img 
                                    src={coverUrl} 
                                    alt={track.title} 
                                    onError={() => handleCoverError(track.id)} 
                                />
                            </div>
                            <div className={styles.auOrderTrackInfo}>
                                <div className={styles.auOrderTitle}>{track.title}</div>
                                <div className={styles.auOrderArtist}>{track.artist}</div>
                            </div>
                        </div>
                        <div className={styles.auOrderTrackRight}>
                            
                            <div className={styles.auOrderTrackDuration}>{track.duration}</div>
                            {index === currentTrackIndex && (
                                <div className={styles.nowPlaying}>
                                    {isPlaying ? (
                                        <div className={styles.playingIcon}>
                                            <span></span><span></span><span></span>
                                        </div>
                                    ) : (
                                        <div className={styles.pausedIcon}>
                                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                <path d="M8 5v14l11-7z"/>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            )}
                            {onDeleteTrack && (
                                <button 
                                    className={`${styles.deleteButton} ${deleteConfirm === track.id ? styles.confirmDelete : ''}`}
                                    onClick={(e) => handleDeleteClick(e, track.id)}
                                    title={deleteConfirm === track.id ? "Нажмите еще раз для подтверждения" : "Удалить трек"}
                                >
                                    {deleteConfirm === track.id ? (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                                        </svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/>
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default AuOrder;
