import React, { useState, useEffect } from 'react';
import { MusicAlbum } from '../../types/music.types';
import { MusicAlbumService } from '../../services/music-album.service';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress } from '@mui/material';
import styles from './MusicAlbumSelector.module.css';
import UniversalMusicAlbumItem from '../UniversalAlbumItem/UniversalAlbumItem';

interface MusicAlbumSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onAlbumsSelected: (albums: MusicAlbum[]) => void;
    maxAlbums?: number;
    preSelectedAlbums?: MusicAlbum[];
}

const MusicAlbumSelector: React.FC<MusicAlbumSelectorProps> = ({
    isOpen,
    onClose,
    onAlbumsSelected,
    maxAlbums = 5,
    preSelectedAlbums = []
}) => {
    const [albums, setAlbums] = useState<MusicAlbum[]>([]);
    const [selectedAlbums, setSelectedAlbums] = useState<MusicAlbum[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadAlbums();
            setSelectedAlbums(preSelectedAlbums);
        }
    }, [isOpen, preSelectedAlbums]);

    const loadAlbums = async () => {
        try {
            setLoading(true);
            const response = await MusicAlbumService.getUserAlbums();
            setAlbums(response);
        } catch (error) {
            console.error('Ошибка при загрузке музыкальных альбомов:', error);
        } finally {
            setLoading(false);
        }
    };

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
                }
            } else {
                alert(`Вы можете выбрать максимум ${maxAlbums} альбомов`);
            }
        }
    };

    const handleConfirm = () => {
        onAlbumsSelected(selectedAlbums);
        onClose();
    };

    const handleCancel = () => {
        setSelectedAlbums(preSelectedAlbums);
        onClose();
    };

    const isAlbumSelected = (album: MusicAlbum) => selectedAlbums.some(a => a.id === album.id);

    return (
        <Dialog open={isOpen} onClose={handleCancel} maxWidth="md" fullWidth>
            <DialogTitle>Выберите музыкальные альбомы</DialogTitle>
            <DialogContent>
                {loading ? (
                    <div className={styles.loader}>
                        <CircularProgress />
                    </div>
                ) : albums.length === 0 ? (
                    <div className={styles.noAlbums}>
                        У вас еще нет музыкальных альбомов. Создайте их в разделе Музыка.
                    </div>
                ) : (
                    <div className={styles.albumGrid}>
                        {albums.map(album => (
                            <div 
                                key={album.id} 
                                className={`${styles.albumItem} ${isAlbumSelected(album) ? styles.selected : ''}`}
                            >
                                <UniversalMusicAlbumItem
                                    album={album}
                                    variant="default"
                                    onAlbumClick={() => toggleAlbumSelection(album)}
                                />
                                {isAlbumSelected(album) && (
                                    <div className={styles.selectedIndicator}>✓</div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleCancel} color="primary">
                    Отмена
                </Button>
                <Button 
                    onClick={handleConfirm} 
                    color="primary" 
                    disabled={selectedAlbums.length === 0}
                >
                    Выбрать ({selectedAlbums.length}/{maxAlbums})
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MusicAlbumSelector; 