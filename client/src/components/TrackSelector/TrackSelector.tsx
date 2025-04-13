import React, { useState, useEffect } from 'react';
import { Track } from '../../types/music.types';
import { api } from '../../utils/api';
import styles from './TrackSelector.module.css';

interface TrackSelectorProps {
  userId: number;
  onSelect: (tracks: Track[]) => void;
  onCancel: () => void;
  multiple?: boolean;
}

const TrackSelector: React.FC<TrackSelectorProps> = ({ userId, onSelect, onCancel, multiple = false }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTracks = async () => {
      try {
        setLoading(true);
        const response = await api.get('/music');
        // Проверяем структуру ответа и извлекаем треки
        const tracksData = response.tracks || response;
        setTracks(tracksData);
        setLoading(false);
      } catch (err) {
        console.error('Ошибка при загрузке треков:', err);
        setError('Не удалось загрузить треки. Пожалуйста, попробуйте позже.');
        setLoading(false);
      }
    };

    fetchTracks();
  }, [userId]);

  const handleTrackSelect = (track: Track) => {
    if (multiple) {
      // Множественный выбор
      if (selectedTracks.some(t => t.id === track.id)) {
        setSelectedTracks(selectedTracks.filter(t => t.id !== track.id));
      } else {
        setSelectedTracks([...selectedTracks, track]);
      }
    } else {
      // Одиночный выбор
      setSelectedTracks([track]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedTracks);
  };

  const filteredTracks = tracks.filter(track =>
    track.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    track.artist.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Выберите музыку</h2>
        <button
          className={styles.closeButton}
          onClick={onCancel}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Поиск по названию или исполнителю"
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div className={styles.trackList}>
          {filteredTracks.length === 0 ? (
            <div className={styles.noResults}>Ничего не найдено</div>
          ) : (
            filteredTracks.map(track => (
              <div
                key={track.id}
                className={`${styles.trackItem} ${selectedTracks.some(t => t.id === track.id) ? styles.selected : ''}`}
                onClick={() => handleTrackSelect(track)}
              >
                <div className={styles.trackCover}>
                  <img src={track.coverUrl} alt={track.title} />
                </div>
                <div className={styles.trackInfo}>
                  <div className={styles.trackTitle}>{track.title}</div>
                  <div className={styles.trackArtist}>{track.artist}</div>
                </div>
                <div className={styles.trackDuration}>{track.duration}</div>
              </div>
            ))
          )}
        </div>
      )}

      <div className={styles.footer}>
        <button className={styles.cancelButton} onClick={onCancel}>
          Отмена
        </button>
        <button
          className={styles.confirmButton}
          onClick={handleConfirm}
          disabled={selectedTracks.length === 0}
        >
          {selectedTracks.length > 0
            ? `Выбрать (${selectedTracks.length})`
            : 'Выбрать'}
        </button>
      </div>
    </div>
  );
};

export default TrackSelector; 