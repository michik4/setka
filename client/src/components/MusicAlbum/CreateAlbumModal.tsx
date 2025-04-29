import React, { useState, useRef, useEffect } from 'react';
import { MusicAlbumService } from '../../services/music-album.service';
import { DEFAULT_COVER_URL } from '../../config/constants';
import styles from './MusicAlbum.module.css';
import { Track } from '../../types/music.types';
import TrackSelector from '../TrackSelector/TrackSelector';

interface CreateAlbumModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAlbumCreated: (albumId: number) => void;
    availableTracks: Track[];
    userId?: number;
}

const CreateAlbumModal: React.FC<CreateAlbumModalProps> = ({ 
    isOpen, 
    onClose, 
    onAlbumCreated,
    availableTracks,
    userId = 0
}) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedTrackIds, setSelectedTrackIds] = useState<number[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [isTrackSelectorOpen, setIsTrackSelectorOpen] = useState(false);
    const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
    const [useFirstTrackCover, setUseFirstTrackCover] = useState(true);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Отслеживаем изменения в списке выбранных треков, чтобы обновить предпросмотр обложки
    useEffect(() => {
        // Если обложка не была выбрана пользователем и стоит флаг использования обложки первого трека
        if (!coverFile && useFirstTrackCover && selectedTracks.length > 0) {
            const firstTrack = selectedTracks[0];
            if (firstTrack.coverUrl) {
                setCoverPreview(firstTrack.coverUrl);
            }
        }
    }, [selectedTracks, coverFile, useFirstTrackCover]);

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setCoverFile(file);
            setCoverPreview(URL.createObjectURL(file));
            setUseFirstTrackCover(false); // Пользователь выбрал собственную обложку
        }
    };

    const handleTrackToggle = (trackId: number) => {
        setSelectedTrackIds(prevSelected => {
            if (prevSelected.includes(trackId)) {
                return prevSelected.filter(id => id !== trackId);
            } else {
                return [...prevSelected, trackId];
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Создаем альбом
            const album = await MusicAlbumService.createAlbum(
                title,
                description,
                isPrivate,
                selectedTrackIds.length > 0 ? selectedTrackIds : undefined
            );

            // Если есть пользовательская обложка, загружаем ее
            if (coverFile && album.id) {
                await MusicAlbumService.uploadAlbumCover(album.id, coverFile);
            } 
            // Если пользователь не загрузил свою обложку, но выбрал использовать обложку первого трека
            else if (useFirstTrackCover && selectedTracks.length > 0 && album.id) {
                // Здесь можно добавить запрос для установки обложки из первого трека
                // Сервер должен иметь эндпоинт для установки обложки по URL
                const firstTrackCoverUrl = selectedTracks[0].coverUrl;
                if (firstTrackCoverUrl) {
                    await MusicAlbumService.setAlbumCoverFromUrl(album.id, firstTrackCoverUrl);
                }
            }

            setIsLoading(false);
            onAlbumCreated(album.id);
            resetForm();
            onClose();
        } catch (error) {
            console.error('Ошибка при создании альбома:', error);
            setError('Произошла ошибка при создании альбома. Пожалуйста, попробуйте еще раз.');
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setTitle('');
        setDescription('');
        setIsPrivate(false);
        setSelectedTrackIds([]);
        setSelectedTracks([]);
        setCoverFile(null);
        setCoverPreview(null);
        setUseFirstTrackCover(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSelectTracksFromLibrary = () => {
        setIsTrackSelectorOpen(true);
    };

    const handleTracksSelected = (tracks: Track[]) => {
        setSelectedTracks(prev => {
            // Объединяем треки, избегая дубликатов
            const newTracks = [...prev];
            
            tracks.forEach(track => {
                if (!newTracks.some(t => t.id === track.id)) {
                    newTracks.push(track);
                }
            });
            
            return newTracks;
        });
        
        // Обновляем ID треков для отправки на сервер
        setSelectedTrackIds(prev => {
            const newIds = [...prev];
            
            tracks.forEach(track => {
                if (!newIds.includes(track.id)) {
                    newIds.push(track.id);
                }
            });
            
            return newIds;
        });
        
        // Обновляем обложку из первого трека, если не выбрана своя
        if (!coverFile && useFirstTrackCover && tracks.length > 0 && !selectedTracks.length) {
            setCoverPreview(tracks[0].coverUrl);
        }
        
        setIsTrackSelectorOpen(false);
    };

    const handleRemoveTrack = (trackId: number) => {
        setSelectedTracks(prev => {
            const newTracks = prev.filter(track => track.id !== trackId);
            
            // Если удален первый трек и установлена обложка этого трека
            if (useFirstTrackCover && !coverFile && prev[0]?.id === trackId) {
                // Если остались другие треки, берем обложку нового первого трека
                if (newTracks.length > 0) {
                    setCoverPreview(newTracks[0].coverUrl);
                } else {
                    setCoverPreview(null);
                }
            }
            
            return newTracks;
        });
        
        setSelectedTrackIds(prev => prev.filter(id => id !== trackId));
    };

    const toggleUseFirstTrackCover = (e: React.ChangeEvent<HTMLInputElement>) => {
        const useTrackCover = e.target.checked;
        setUseFirstTrackCover(useTrackCover);
        
        // Если включили опцию и есть треки, но нет своей обложки
        if (useTrackCover && selectedTracks.length > 0 && !coverFile) {
            setCoverPreview(selectedTracks[0].coverUrl);
        }
        // Если выключили опцию и нет своей обложки
        else if (!useTrackCover && !coverFile) {
            setCoverPreview(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Создание нового альбома</h2>
                
                {error && <div className={styles.error}>{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="albumTitle">Название альбома</label>
                        <input
                            id="albumTitle"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Введите название альбома"
                            required
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label htmlFor="albumDescription">Описание</label>
                        <textarea
                            id="albumDescription"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Введите описание альбома (необязательно)"
                            rows={3}
                        />
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label className={styles.checkboxLabel}>
                            <input
                                type="checkbox"
                                checked={isPrivate}
                                onChange={(e) => setIsPrivate(e.target.checked)}
                            />
                            Приватный альбом (виден только вам)
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <div className={styles.tracksHeader}>
                            <label>Треки в альбоме</label>
                            <button 
                                type="button" 
                                className={styles.addTracksButton}
                                onClick={handleSelectTracksFromLibrary}
                            >
                                Выбрать из Моей музыки
                            </button>
                        </div>

                        <div className={styles.selectedTracksList}>
                            {selectedTracks.length === 0 ? (
                                <div className={styles.noTracksMessage}>
                                    В альбоме пока нет треков. Нажмите "Выбрать из Моей музыки", чтобы добавить треки.
                                </div>
                            ) : (
                                selectedTracks.map(track => (
                                    <div key={track.id} className={styles.selectedTrackItem}>
                                        <div className={styles.trackCover}>
                                            <img src={track.coverUrl} alt={track.title} />
                                        </div>
                                        <div className={styles.trackInfo}>
                                            <span className={styles.trackTitle}>{track.title}</span>
                                            <span className={styles.trackArtist}>{track.artist}</span>
                                        </div>
                                        <button 
                                            type="button" 
                                            className={styles.removeTrackButton}
                                            onClick={() => handleRemoveTrack(track.id)}
                                            aria-label="Удалить трек"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                    
                    <div className={styles.formGroup}>
                        <label htmlFor="albumCover">Обложка альбома</label>
                        <div className={styles.coverUpload}>
                            <div className={styles.coverPreview}>
                                <img
                                    src={coverPreview || DEFAULT_COVER_URL}
                                    alt="Обложка альбома"
                                />
                            </div>
                            <div className={styles.coverUploadControls}>
                                <input
                                    id="albumCover"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverChange}
                                    ref={fileInputRef}
                                />
                                {selectedTracks.length > 0 && (
                                    <label className={styles.checkboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={useFirstTrackCover}
                                            onChange={toggleUseFirstTrackCover}
                                            disabled={coverFile !== null}
                                        />
                                        Использовать обложку первого трека
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className={styles.formActions}>
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                onClose();
                            }}
                            className={styles.cancelButton}
                            disabled={isLoading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className={styles.createButton}
                            disabled={isLoading || !title}
                        >
                            {isLoading ? 'Создание...' : 'Создать альбом'}
                        </button>
                    </div>
                </form>
            </div>

            {isTrackSelectorOpen && (
                <TrackSelector
                    userId={userId}
                    onSelect={handleTracksSelected}
                    onCancel={() => setIsTrackSelectorOpen(false)}
                    multiple={true}
                />
            )}
        </div>
    );
};

export default CreateAlbumModal; 