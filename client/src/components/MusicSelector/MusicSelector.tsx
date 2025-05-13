import React, { useState, useEffect } from 'react';
import { Track, MusicAlbum } from '../../types/music.types';
import { MusicService } from '../../services/music.service';
import { MusicAlbumService } from '../../services/music-album.service';
import styles from './MusicSelector.module.css';
import UniversalMusicAlbumItem from '../UniversalAlbumItem/UniversalAlbumItem';

interface MusicSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onTracksSelected: (tracks: Track[]) => void;
    onAlbumsSelected: (albums: MusicAlbum[]) => void;
    maxAlbums?: number;
    maxTracks?: number;
    userId?: number;
}

const MusicSelector: React.FC<MusicSelectorProps> = ({
    isOpen,
    onClose,
    onTracksSelected,
    onAlbumsSelected,
    maxAlbums = 5,
    maxTracks = 10,
    userId
}) => {
    const [activeTab, setActiveTab] = useState(0);
    
    // Треки
    const [tracks, setTracks] = useState<Track[]>([]);
    const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
    const [searchTrackTerm, setSearchTrackTerm] = useState('');
    
    // Альбомы
    const [albums, setAlbums] = useState<MusicAlbum[]>([]);
    const [selectedAlbums, setSelectedAlbums] = useState<MusicAlbum[]>([]);
    const [searchAlbumTerm, setSearchAlbumTerm] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            if (activeTab === 0) {
                loadTracks();
            } else {
                loadAlbums();
            }
        }
    }, [isOpen, activeTab]);

    const loadTracks = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await MusicService.getUserTracks(1000);
            setTracks(response.tracks);
        } catch (err) {
            console.error('Ошибка при загрузке треков:', err);
            setError('Не удалось загрузить треки. Пожалуйста, попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    const loadAlbums = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await MusicAlbumService.getUserAlbums();
            setAlbums(response);
        } catch (err) {
            console.error('Ошибка при загрузке музыкальных альбомов:', err);
            setError('Не удалось загрузить музыкальные альбомы. Пожалуйста, попробуйте позже.');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (newValue: number) => {
        setActiveTab(newValue);
    };

    // Обработчики для треков
    const toggleTrackSelection = (track: Track) => {
        if (selectedTracks.some(t => t.id === track.id)) {
            setSelectedTracks(prev => prev.filter(t => t.id !== track.id));
        } else {
            if (selectedTracks.length < maxTracks) {
                setSelectedTracks(prev => [...prev, track]);
            } else {
                alert(`Вы можете выбрать максимум ${maxTracks} треков`);
            }
        }
    };

    const isTrackSelected = (track: Track) => selectedTracks.some(t => t.id === track.id);

    // Обработчики для альбомов
    const toggleAlbumSelection = (album: MusicAlbum) => {
        // Проверяем, выбран ли уже альбом
        const isSelected = selectedAlbums.some(a => a.id === album.id);
        
        if (isSelected) {
            // Если выбран, удаляем из списка
            setSelectedAlbums(prev => prev.filter(a => a.id !== album.id));
        } else {
            // Если еще не выбран, проверяем, не превышен ли лимит
            if (selectedAlbums.length < maxAlbums) {
                // Проверяем, нет ли уже такого альбома в списке
                if (!selectedAlbums.some(a => a.id === album.id)) {
                    setSelectedAlbums(prev => [...prev, album]);
                } else {
                    console.warn('Альбом уже добавлен в список выбранных:', album.title);
                }
            } else {
                alert(`Вы можете выбрать максимум ${maxAlbums} альбомов`);
            }
        }
    };

    const isAlbumSelected = (album: MusicAlbum) => selectedAlbums.some(a => a.id === album.id);

    // Фильтрация по поиску
    const filteredTracks = tracks.filter(track =>
        track.title.toLowerCase().includes(searchTrackTerm.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchTrackTerm.toLowerCase())
    );

    const filteredAlbums = albums.filter(album =>
        album.title.toLowerCase().includes(searchAlbumTerm.toLowerCase()) ||
        (album.userId === userId) // Показываем все свои альбомы
    );

    // Обработчики подтверждения выбора
    const handleConfirm = () => {
        console.log('MusicSelector - handleConfirm, activeTab:', activeTab);
        
        if (activeTab === 0 && selectedTracks.length > 0) {
            console.log('MusicSelector - выбраны треки:', selectedTracks.map(t => t.title));
            onTracksSelected(selectedTracks);
            setSelectedTracks([]);
        } else if (activeTab === 1 && selectedAlbums.length > 0) {
            console.log('MusicSelector - выбраны альбомы:', selectedAlbums.map(a => `${a.title} (ID: ${a.id})`));
            onAlbumsSelected(selectedAlbums);
            setSelectedAlbums([]);
        }
        onClose();
    };

    const handleCancel = () => {
        setSelectedTracks([]);
        setSelectedAlbums([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h2>Выберите музыку</h2>
                    <button className={styles.closeButton} onClick={handleCancel}>×</button>
                </div>
                
                <div className={styles.tabs}>
                    <button 
                        type='button'
                        className={`${styles.tabButton} ${activeTab === 0 ? styles.activeTab : ''}`} 
                        onClick={() => handleTabChange(0)}
                    >
                        Треки
                    </button>
                    <button 
                        type='button'
                        className={`${styles.tabButton} ${activeTab === 1 ? styles.activeTab : ''}`} 
                        onClick={() => handleTabChange(1)}
                    >
                        Альбомы
                    </button>
                </div>
                
                <div className={styles.searchContainer}>
                    <input
                        type="text"
                        placeholder={activeTab === 0 ? "Поиск по названию или исполнителю" : "Поиск по названию альбома"}
                        className={styles.searchInput}
                        value={activeTab === 0 ? searchTrackTerm : searchAlbumTerm}
                        onChange={(e) => activeTab === 0 
                            ? setSearchTrackTerm(e.target.value) 
                            : setSearchAlbumTerm(e.target.value)}
                    />
                </div>
                
                <div className={styles.contentBody}>
                    {loading ? (
                        <div className={styles.loading}>
                            <div className={styles.spinner}></div>
                        </div>
                    ) : error ? (
                        <div className={styles.error}>{error}</div>
                    ) : activeTab === 0 ? (
                        // Вкладка треков
                        <div className={styles.trackList}>
                            {filteredTracks.length === 0 ? (
                                <div className={styles.noResults}>Ничего не найдено</div>
                            ) : (
                                filteredTracks.map(track => (
                                    <div
                                        key={track.id}
                                        className={`${styles.trackItem} ${isTrackSelected(track) ? styles.selected : ''}`}
                                        onClick={() => toggleTrackSelection(track)}
                                    >
                                        <div className={styles.trackCover}>
                                            <img src={track.coverUrl} alt={track.title} />
                                        </div>
                                        <div className={styles.trackInfo}>
                                            <div className={styles.trackTitle}>{track.title}</div>
                                            <div className={styles.trackArtist}>{track.artist}</div>
                                        </div>
                                        <div className={styles.trackDuration}>{track.duration}</div>
                                        {isTrackSelected(track) && (
                                            <div className={styles.selectedIndicator}>✓</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        // Вкладка альбомов
                        <div className={styles.albumGrid}>
                            {filteredAlbums.length === 0 ? (
                                <div className={styles.noResults}>Ничего не найдено</div>
                            ) : (
                                filteredAlbums.map(album => (
                                    <div 
                                        key={album.id} 
                                        className={`${styles.albumItem} ${isAlbumSelected(album) ? styles.selected : ''}`}
                                        onClick={() => toggleAlbumSelection(album)}
                                    >
                                        <UniversalMusicAlbumItem
                                            album={album}
                                            variant="default"
                                        />
                                        {isAlbumSelected(album) && (
                                            <div className={styles.selectedIndicator}>✓</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
                
                <div className={styles.footer}>
                    <button className={styles.cancelButton} onClick={handleCancel}>
                        Отмена
                    </button>
                    <button 
                        className={styles.confirmButton} 
                        onClick={handleConfirm} 
                        disabled={(activeTab === 0 && selectedTracks.length === 0) || 
                                (activeTab === 1 && selectedAlbums.length === 0)}
                    >
                        {activeTab === 0 ? (
                            `Выбрать треки (${selectedTracks.length}/${maxTracks})`
                        ) : (
                            `Выбрать альбомы (${selectedAlbums.length}/${maxAlbums})`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MusicSelector; 