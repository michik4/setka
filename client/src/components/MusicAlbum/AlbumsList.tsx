import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MusicAlbumService } from '../../services/music-album.service';
import { MusicService } from '../../services/music.service';
import { MusicAlbum, Track } from '../../types/music.types';
import { DEFAULT_COVER_URL } from '../../config/constants';
import CreateAlbumModal from './CreateAlbumModal';
import styles from './MusicAlbum.module.css';
import { Spinner } from '../Spinner/Spinner';
import { API_URL } from '../../config/constants';
import { usePlayer } from '../../contexts/PlayerContext';

// Внутренний компонент для карточки альбома
interface AlbumCardProps {
    album: MusicAlbum;
}

const AlbumCard: React.FC<AlbumCardProps> = ({ album }) => {
    const coverUrl = album.coverUrl || DEFAULT_COVER_URL;
    
    return (
        <Link to={`/music/albums/${album.id}`} className={styles.albumCard}>
            <img 
                src={coverUrl} 
                alt={album.title} 
                className={styles.albumCover}
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_COVER_URL }} 
            />
            <div className={styles.albumInfo}>
                <h3 className={styles.albumTitle}>
                    {album.title}
                    {album.isPrivate && <span className={styles.privateIndicator}>Приватный</span>}
                </h3>
                <div className={styles.albumTracks}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 19V5L21 3V17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="6" cy="19" r="3" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="18" cy="17" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    {album.tracksCount} {getTrackWord(album.tracksCount)}
                </div>
            </div>
        </Link>
    );
};

// Функция для правильного склонения слова "трек"
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

const AlbumsList: React.FC = () => {
    const [albums, setAlbums] = useState<MusicAlbum[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    // Получаем все треки пользователя для отображения в форме создания альбома
    const [availableTracks, setAvailableTracks] = useState<Track[]>([]);
    const [userId, setUserId] = useState<number>(0);
    
    // Получаем состояние плеера
    const { currentTrack, isPlaying } = usePlayer();

    useEffect(() => {
        // Сохраняем текущее состояние воспроизведения
        const isCurrentlyPlaying = isPlaying;
        const currentPlayingTrack = currentTrack;
        
        fetchAlbums();
        fetchUserTracks();
        
        // Получаем ID пользователя из localStorage
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            try {
                const parsedInfo = JSON.parse(userInfo);
                if (parsedInfo && parsedInfo.id) {
                    setUserId(parsedInfo.id);
                }
            } catch (error) {
                console.error('Ошибка при получении ID пользователя:', error);
            }
        }
    }, []);

    const fetchAlbums = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const albumsData = await MusicAlbumService.getUserAlbums();
            setAlbums(albumsData);
        } catch (error) {
            console.error('Ошибка при получении альбомов:', error);
            setError('Не удалось загрузить альбомы. Пожалуйста, попробуйте еще раз.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUserTracks = async () => {
        try {
            // Получаем треки пользователя через сервис
            const response = await MusicService.getUserTracks(1000);
            setAvailableTracks(response.tracks);
            console.log(`Загружено ${response.tracks.length} треков для выбора в альбом`);
        } catch (error) {
            console.error('Ошибка при получении треков пользователя:', error);
        }
    };

    const handleAlbumCreated = (albumId: number) => {
        // Перезагружаем список альбомов после создания нового
        fetchAlbums();
    };

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Spinner />
                <p>Загрузка альбомов...</p>
            </div>
        );
    }

    return (
        <div className={styles.albumsContainer}>
            <div className={styles.albumsHeader}>
                <h2 className={styles.albumsTitle}>Мои альбомы</h2>
                <button
                    className={styles.createAlbumButton}
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M18 12L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Создать альбом
                </button>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {albums.length === 0 ? (
                <div className={styles.emptyState}>
                    <p>У вас пока нет музыкальных альбомов. Создайте свой первый альбом, чтобы организовать вашу музыку!</p>
                    <button
                        className={styles.createAlbumButton}
                        onClick={() => setIsCreateModalOpen(true)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                            <path d="M18 12L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        Создать первый альбом
                    </button>
                </div>
            ) : (
                <div className={styles.albumsGrid}>
                    {albums.map(album => (
                        <AlbumCard key={album.id} album={album} />
                    ))}
                </div>
            )}

            <CreateAlbumModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onAlbumCreated={handleAlbumCreated}
                availableTracks={availableTracks}
                userId={userId}
            />
        </div>
    );
};

export default AlbumsList; 