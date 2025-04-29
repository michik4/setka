import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import AlbumsList from '../components/MusicAlbum/AlbumsList';
import AlbumDetails from '../components/MusicAlbum/AlbumDetails';
import styles from './MusicAlbumPage.module.css';
import { usePlayer } from '../contexts/PlayerContext';

export const MusicAlbumPage: React.FC = () => {
    const { currentTrack, isPlaying, audio } = usePlayer();
    
    // Сохраняем текущее состояние воспроизведения при монтировании компонента
    useEffect(() => {
        // Если был плеер активен, предотвращаем сброс воспроизведения
        if (currentTrack && isPlaying) {
            // Предотвращаем паузу при перерендере компонента
            const resumePlayback = () => {
                if (audio && isPlaying) {
                    audio.play().catch(err => {
                        console.error('[MusicAlbumPage] Ошибка при возобновлении воспроизведения:', err);
                    });
                }
            };
            
            // Небольшая задержка для завершения перехода
            const timerId = setTimeout(resumePlayback, 50);
            return () => clearTimeout(timerId);
        }
    }, [currentTrack, isPlaying, audio]);
    
    return (
        <div className={styles.musicAlbumPage}>
            <Routes>
                <Route path="/" element={<AlbumsList />} />
                <Route path="/:albumId" element={<AlbumDetails />} />
            </Routes>
        </div>
    );
};

export default MusicAlbumPage; 