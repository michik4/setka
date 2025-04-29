import React, { useState, useRef } from 'react';
import { MusicAlbumService } from '../../services/music-album.service';
import styles from './MusicAlbum.module.css';

interface UploadTracksToAlbumModalProps {
    albumId: number;
    isOpen: boolean;
    onClose: () => void;
    onUploadSuccess: () => void;
}

const UploadTracksToAlbumModal: React.FC<UploadTracksToAlbumModalProps> = ({
    albumId,
    isOpen,
    onClose,
    onUploadSuccess
}) => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            // Преобразуем FileList в массив
            const filesArray = Array.from(e.target.files);
            setSelectedFiles(filesArray);
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFiles.length === 0) {
            setError('Пожалуйста, выберите хотя бы один аудиофайл');
            return;
        }

        setIsUploading(true);
        setError(null);

        try {
            await MusicAlbumService.uploadTracksToAlbum(albumId, selectedFiles);
            
            setIsUploading(false);
            resetForm();
            onUploadSuccess();
            onClose();
        } catch (error) {
            console.error('Ошибка при загрузке треков в альбом:', error);
            setError('Произошла ошибка при загрузке треков. Пожалуйста, попробуйте еще раз.');
            setIsUploading(false);
        }
    };

    const resetForm = () => {
        setSelectedFiles([]);
        setUploadProgress(0);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Загрузка треков в альбом</h2>
                
                {error && <div className={styles.error}>{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="audioFiles">Выберите аудиофайлы</label>
                        <input
                            id="audioFiles"
                            type="file"
                            accept="audio/*"
                            multiple
                            onChange={handleFileChange}
                            ref={fileInputRef}
                            disabled={isUploading}
                        />
                        <p className={styles.hint}>
                            Поддерживаемые форматы: .mp3, .wav, .ogg
                            <br />
                            Максимальный размер файла: 100 МБ
                        </p>
                    </div>
                    
                    {selectedFiles.length > 0 && (
                        <div className={styles.formGroup}>
                            <label>Выбранные файлы:</label>
                            <ul className={styles.filesList}>
                                {selectedFiles.map((file, index) => (
                                    <li key={index} className={styles.fileItem}>
                                        <span className={styles.fileName}>{file.name}</span>
                                        <span className={styles.fileSize}>({(file.size / (1024 * 1024)).toFixed(2)} МБ)</span>
                                        <button
                                            type="button"
                                            className={styles.removeFileButton}
                                            onClick={() => removeFile(index)}
                                            disabled={isUploading}
                                        >
                                            &times;
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {isUploading && (
                        <div className={styles.progressContainer}>
                            <div 
                                className={styles.progressBar} 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                            <span className={styles.progressText}>{uploadProgress}%</span>
                        </div>
                    )}
                    
                    <div className={styles.formActions}>
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                onClose();
                            }}
                            className={styles.cancelButton}
                            disabled={isUploading}
                        >
                            Отмена
                        </button>
                        <button
                            type="submit"
                            className={styles.createButton}
                            disabled={isUploading || selectedFiles.length === 0}
                        >
                            {isUploading ? 'Загрузка...' : 'Загрузить треки'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadTracksToAlbumModal; 