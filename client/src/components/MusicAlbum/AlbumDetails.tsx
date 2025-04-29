import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MusicAlbumService } from '../../services/music-album.service';
import { MusicAlbum, Track } from '../../types/music.types';
import { DEFAULT_COVER_URL } from '../../config/constants';
import UploadTracksToAlbumModal from './UploadTracksToAlbumModal';
import { usePlayer } from '../../contexts/PlayerContext';
import { useQueue } from '../../contexts/QueueContext';
import TrackItem from '../TrackItem/TrackItem';
import styles from './MusicAlbum.module.css';
import { Spinner } from '../Spinner/Spinner';

const AlbumDetails: React.FC = () => {
    const { albumId } = useParams<{ albumId: string }>();
    const navigate = useNavigate();
    const { playTrack, currentTrack, isPlaying, togglePlay } = usePlayer();
    const { replaceQueue, addToQueue } = useQueue();
    
    const [album, setAlbum] = useState<MusicAlbum | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
    
    // Используем ref для отслеживания, выполнен ли первоначальный запрос
    const initialFetchDone = useRef(false);

    useEffect(() => {
        // Сохраняем состояние плеера
        const wasPlaying = isPlaying;
        const currentlyPlayingTrack = currentTrack;
    
        if (albumId && !initialFetchDone.current) {
            fetchAlbum(parseInt(albumId));
            initialFetchDone.current = true;
        }
    }, [albumId]);

    const fetchAlbum = async (id: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const albumData = await MusicAlbumService.getAlbumById(id);
            setAlbum(albumData);
        } catch (error) {
            console.error(`Ошибка при получении альбома ${id}:`, error);
            setError('Не удалось загрузить альбом. Пожалуйста, попробуйте еще раз.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTrackPlay = (track: Track) => {
        // Заменяем очередь треками альбома, начиная с выбранного трека
        if (album && album.tracks && album.tracks.length > 0) {
            const trackIndex = album.tracks.findIndex(t => t.id === track.id);
            if (trackIndex !== -1) {
                replaceQueue(album.tracks);
                playTrack(track);
            } else {
                playTrack(track);
            }
        } else {
            playTrack(track);
        }
    };

    const handlePlayAllTracks = () => {
        if (album && album.tracks && album.tracks.length > 0) {
            // Заменяем текущую очередь треками из альбома
            replaceQueue(album.tracks);
            // Воспроизводим первый трек
            playTrack(album.tracks[0]);
        }
    };

    const handleRemoveTrack = async (trackId: number) => {
        if (!album || !albumId) return;
        
        try {
            await MusicAlbumService.removeTrackFromAlbum(parseInt(albumId), trackId);
            // Обновляем данные альбома
            fetchAlbum(parseInt(albumId));
        } catch (error) {
            console.error(`Ошибка при удалении трека ${trackId} из альбома:`, error);
            setError('Не удалось удалить трек из альбома. Пожалуйста, попробуйте еще раз.');
        }
    };

    const handleDeleteAlbum = async () => {
        if (!album || !albumId) return;
        
        try {
            await MusicAlbumService.deleteAlbum(parseInt(albumId));
            navigate('/music/albums');
        } catch (error) {
            console.error(`Ошибка при удалении альбома ${albumId}:`, error);
            setError('Не удалось удалить альбом. Пожалуйста, попробуйте еще раз.');
        }
    };

    const handleUploadSuccess = () => {
        if (albumId) {
            fetchAlbum(parseInt(albumId));
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

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner />
                <p>Загрузка альбома...</p>
            </div>
        );
    }

    if (error) {
        return <div className={styles.error}>{error}</div>;
    }

    if (!album) {
        return <div className={styles.error}>Альбом не найден</div>;
    }

    return (
        <div className={styles.albumPage}>
            <div className={styles.albumHeader}>
                <div className={styles.albumHeaderFlex}>
                    <div className={styles.albumHeaderCover}>
                        <img 
                            src={album.coverUrl || DEFAULT_COVER_URL} 
                            alt={album.title} 
                            onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COVER_URL }}
                        />
                    </div>
                    <div className={styles.albumHeaderInfo}>
                        <h1 className={styles.albumHeaderTitle}>
                            {album.title}
                            {album.isPrivate && <span className={styles.privateIndicator}>Приватный</span>}
                        </h1>
                        
                        {album.description && (
                            <p className={styles.albumHeaderDescription}>{album.description}</p>
                        )}
                        
                        <div className={styles.albumStats}>
                            <span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 19V5L21 3V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <circle cx="6" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                {album.tracksCount} {getTrackWord(album.tracksCount)}
                            </span>
                            <span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                                    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                    <path d="M3 10H21" stroke="currentColor" strokeWidth="2"/>
                                </svg>
                                Создан: {new Date(album.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className={styles.albumActions}>
                    <button 
                        className={`${styles.actionButton} ${styles.primaryButton}`}
                        onClick={handlePlayAllTracks}
                        disabled={!album.tracks || album.tracks.length === 0}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 4.99998L19 12L5 19V4.99998Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                        </svg>
                        Воспроизвести все
                    </button>
                    <button 
                        className={`${styles.actionButton} ${styles.secondaryButton}`}
                        onClick={() => setIsUploadModalOpen(true)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M7.5 14.5L12 10L16.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M16 4H19C20.1046 4 21 4.89543 21 6V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V6C3 4.89543 3.89543 4 5 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Добавить треки
                    </button>
                    <button 
                        className={`${styles.actionButton} ${styles.dangerButton}`}
                        onClick={() => setIsConfirmDeleteOpen(true)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M4 7H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M10 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M14 11V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M5 7L6 19C6 20.1046 6.89543 21 8 21H16C17.1046 21 18 20.1046 18 19L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M9 7V4C9 3.44772 9.44772 3 10 3H14C14.5523 3 15 3.44772 15 4V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Удалить альбом
                    </button>
                </div>
            </div>
            
            <div className={styles.tracksSection}>
                <h2>Треки в альбоме</h2>
                
                {!album.tracks || album.tracks.length === 0 ? (
                    <div className={styles.emptyTracks}>
                        <p>В этом альбоме пока нет треков.</p>
                        <button 
                            className={styles.uploadButton}
                            onClick={() => setIsUploadModalOpen(true)}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 20V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                <path d="M7.5 14.5L12 10L16.5 14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                <path d="M16 4H19C20.1046 4 21 4.89543 21 6V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V6C3 4.89543 3.89543 4 5 4H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            </svg>
                            Добавить треки
                        </button>
                    </div>
                ) : (
                    <div className={styles.tracksList}>
                        {album.tracks.map((track, index) => (
                            <TrackItem 
                                key={track.id}
                                track={track}
                                index={index + 1}
                                isInLibrary={true}  
                                showArtist={true}
                                showDuration={true}
                                showControls={true}
                                onRemove={handleRemoveTrack}
                                onAddToQueue={(track) => addToQueue(track)}
                                className={styles.inTable}
                            />
                        ))}
                    </div>
                )}
            </div>
            
            {/* Модальное окно для загрузки треков */}
            <UploadTracksToAlbumModal
                albumId={parseInt(albumId || '0')}
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUploadSuccess={handleUploadSuccess}
            />
            
            {/* Модальное окно подтверждения удаления */}
            {isConfirmDeleteOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2>Удаление альбома</h2>
                        <p>Вы уверены, что хотите удалить альбом "{album.title}"?</p>
                        <p>Это действие нельзя отменить. Треки, которые были добавлены в альбом, останутся в вашей музыкальной библиотеке.</p>
                        
                        <div className={styles.formActions}>
                            <button
                                className={styles.cancelButton}
                                onClick={() => setIsConfirmDeleteOpen(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className={`${styles.dangerButton}`}
                                onClick={handleDeleteAlbum}
                            >
                                Удалить альбом
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Вспомогательная функция для правильного склонения слова "трек"
function getTrackWord(count: number): string {
    const lastDigit = count % 10;
    const lastTwoDigits = count % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
        return 'треков';
    }
    
    if (lastDigit === 1) {
        return 'трек';
    }
    
    if (lastDigit >= 2 && lastDigit <= 4) {
        return 'трека';
    }
    
    return 'треков';
}

export default AlbumDetails; 