import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './UploadAudio.module.css';

// API URL из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Добавить константу для обложки по умолчанию
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

interface UploadedTrack {
    id: number;
    title: string;
    artist: string;
    duration: string;
    coverUrl: string;
    filepath: string;
    filename: string;
    playCount: number;
}

interface UploadResult {
    success: boolean;
    track?: UploadedTrack;
    originalName: string;
    error?: string;
    metadata?: {
        title: string;
        artist: string;
        duration: string;
        year?: string;
        genre?: string;
        albumTitle?: string;
    };
}

interface MultiUploadAudioProps {
    onTracksUploaded?: (newTracks: UploadedTrack[]) => void;
}

const MultiUploadAudio: React.FC<MultiUploadAudioProps> = ({ onTracksUploaded }) => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [coverFileName, setCoverFileName] = useState('');
    const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
    
    const formRef = useRef<HTMLFormElement>(null);
    const coverPreviewRef = useRef<HTMLImageElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Обработчик нажатия клавиши Escape для закрытия модального окна
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isModalOpen) {
                closeModal();
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isModalOpen]);

    // Предотвращение скролла при открытом модальном окне
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isModalOpen]);

    // Обработчик клика вне модального окна
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && 
                event.target instanceof Element && 
                !modalRef.current.contains(event.target) && 
                event.target.classList.contains(styles.modalOverlay)) {
                closeModal();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const openModal = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        if (isUploading) return; // Предотвращаем закрытие во время загрузки
        setIsModalOpen(false);
        resetForm();
    };

    const resetForm = () => {
        if (formRef.current) {
            formRef.current.reset();
        }
        setSelectedFiles([]);
        setCoverFileName('');
        setUploadProgress(0);
        setUploadResults([]);
        
        if (coverPreviewRef.current) {
            coverPreviewRef.current.style.display = 'none';
        }
    };

    const handleAudioFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const fileArray = Array.from(files).filter(file => 
                file.type.startsWith('audio/') || 
                file.name.endsWith('.mp3') ||
                file.name.endsWith('.wav') ||
                file.name.endsWith('.ogg')
            );
            
            if (fileArray.length === 0) {
                alert('Пожалуйста, выберите аудиофайлы');
                return;
            }
            
            setSelectedFiles(fileArray);
        } else {
            setSelectedFiles([]);
        }
    };

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFileName(file.name);
            
            // Показать предпросмотр обложки
            if (coverPreviewRef.current) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    if (coverPreviewRef.current && e.target) {
                        coverPreviewRef.current.src = e.target.result as string;
                        coverPreviewRef.current.style.display = 'block';
                    }
                };
                reader.readAsDataURL(file);
            }
        } else {
            setCoverFileName('');
            if (coverPreviewRef.current) {
                coverPreviewRef.current.style.display = 'none';
            }
        }
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!user) {
            alert('Пожалуйста, войдите в систему для загрузки треков');
            return;
        }
        
        if (selectedFiles.length === 0) {
            alert('Пожалуйста, выберите как минимум один аудиофайл');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadResults([]);

        try {
            const formData = new FormData();
            
            // Добавляем все аудиофайлы с полем 'audioFiles'
            selectedFiles.forEach(file => {
                formData.append('audioFiles', file);
            });
            
            // Добавляем обложку, если она выбрана
            const coverInput = document.getElementById('coverImage') as HTMLInputElement;
            if (coverInput && coverInput.files && coverInput.files.length > 0) {
                formData.append('coverImage', coverInput.files[0]);
            }
            
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/music/upload/multiple`, true);
            xhr.withCredentials = true;
            xhr.setRequestHeader('Accept', 'application/json');
            
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    setUploadProgress(progress);
                }
            };
            
            xhr.onload = () => {
                if (xhr.status === 201) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        
                        setUploadResults(response.results || []);
                        
                        // Если есть обработчик для передачи треков родительскому компоненту
                        if (onTracksUploaded && response.results) {
                            const successfulTracks = response.results
                                .filter((result: UploadResult) => result.success && result.track)
                                .map((result: UploadResult) => result.track);
                            
                            if (successfulTracks.length > 0) {
                                onTracksUploaded(successfulTracks);
                            }
                        }
                        
                        // Не закрываем модальное окно после загрузки, чтобы показать результаты
                        setIsUploading(false);
                    } catch (parseError) {
                        console.error('[MultiUploadAudio] Ошибка парсинга ответа:', parseError);
                        setIsUploading(false);
                        alert('Ошибка обработки ответа сервера');
                    }
                } else {
                    console.error('[MultiUploadAudio] Ошибка при загрузке файлов, статус:', xhr.status);
                    setIsUploading(false);
                    alert(`Ошибка загрузки: ${xhr.status} ${xhr.statusText}`);
                }
            };
            
            xhr.onerror = () => {
                console.error('[MultiUploadAudio] Ошибка при загрузке файлов');
                setIsUploading(false);
                alert('Ошибка соединения с сервером');
            };
            
            xhr.send(formData);
        } catch (error) {
            console.error('[MultiUploadAudio] Ошибка при загрузке треков:', error);
            setIsUploading(false);
            alert('Произошла ошибка при загрузке. Пожалуйста, попробуйте еще раз.');
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type.startsWith('audio/') || 
                file.name.endsWith('.mp3') ||
                file.name.endsWith('.wav') ||
                file.name.endsWith('.ogg')
            );
            
            if (files.length > 0) {
                setSelectedFiles(prev => [...prev, ...files]);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' Б';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
        return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
    };

    return (
        <>
            <button 
                className={`${styles.uploadButton} ${styles.multiUploadButton}`}
                onClick={openModal}
                aria-label="Загрузить музыку"
                title="Загрузить несколько треков"
            >
                <svg 
                    className={styles.uploadButtonIcon} 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                >
                    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
                </svg>
                <span>Загрузить музыку</span>
            </button>

            <div className={`${styles.modalOverlay} ${isModalOpen ? styles.visible : ''}`}>
                <div className={`${styles.modalContent} ${styles.multiUploadModal}`} ref={modalRef}>
                    <div className={styles.modalTitle}>
                        <span>Загрузка музыки</span>
                        <button 
                            className={styles.closeButton} 
                            onClick={closeModal}
                            disabled={isUploading}
                            aria-label="Закрыть"
                        >
                            ×
                        </button>
                    </div>

                    <form 
                        ref={formRef}
                        className={styles.uploadForm} 
                        onSubmit={handleSubmit}
                        encType="multipart/form-data"
                    >
                        <div 
                            className={styles.dropZone}
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                        >
                            <input 
                                type="file" 
                                id="audioFiles" 
                                name="audioFiles" 
                                className={styles.fileInput} 
                                accept="audio/*,.mp3,.wav,.ogg"
                                onChange={handleAudioFilesChange}
                                multiple
                                disabled={isUploading}
                                ref={fileInputRef}
                            />
                            <label htmlFor="audioFiles" className={styles.dropZoneLabel}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
                                </svg>
                                <span>Перетащите MP3 файлы сюда или нажмите для выбора</span>
                                <span className={styles.dropZoneHint}>
                                    Поддерживаются MP3, WAV, OGG файлы
                                </span>
                            </label>
                        </div>

                        {selectedFiles.length > 0 && (
                            <div className={styles.selectedFilesWrap}>
                                <h3 className={styles.selectedFilesTitle}>
                                    Выбрано файлов: {selectedFiles.length}
                                </h3>
                                <ul className={styles.selectedFilesList}>
                                    {selectedFiles.map((file, index) => (
                                        <li key={index} className={styles.selectedFile}>
                                            <span className={styles.selectedFileName}>{file.name}</span>
                                            <span className={styles.selectedFileSize}>
                                                {formatFileSize(file.size)}
                                            </span>
                                            <button 
                                                type="button"
                                                className={styles.removeFileBtn}
                                                onClick={() => removeFile(index)}
                                                disabled={isUploading}
                                                aria-label="Удалить файл"
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className={styles.formGroup}>
                            <label htmlFor="coverImage" className={styles.label}>
                                Общая обложка (опционально)
                            </label>
                            <div className={styles.fileInputWrap}>
                                <label htmlFor="coverImage" className={styles.fileInputLabel}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                                    </svg>
                                    Выбрать изображение
                                </label>
                                <input 
                                    type="file" 
                                    id="coverImage" 
                                    name="coverImage" 
                                    className={styles.fileInput} 
                                    accept="image/*"
                                    onChange={handleCoverFileChange}
                                    disabled={isUploading}
                                />
                                {coverFileName && (
                                    <div className={styles.fileName}>
                                        {coverFileName}
                                    </div>
                                )}
                            </div>
                            <img 
                                ref={coverPreviewRef}
                                src="#" 
                                alt="Предпросмотр" 
                                className={styles.coverPreview} 
                                id="coverPreview"
                            />
                        </div>

                        {isUploading ? (
                            <div className={styles.progressWrap}>
                                <div className={styles.progressBar}>
                                    <div 
                                        className={styles.progressFill} 
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <div className={styles.progressText}>
                                    {uploadProgress}% загружено
                                </div>
                            </div>
                        ) : uploadResults.length > 0 ? (
                            <div className={styles.uploadResults}>
                                <h3 className={styles.uploadResultsTitle}>
                                    Результаты загрузки: успешно {uploadResults.filter(r => r.success).length} из {uploadResults.length}
                                </h3>
                                <ul className={styles.uploadResultsList}>
                                    {uploadResults.map((result, index) => (
                                        <li 
                                            key={index} 
                                            className={`${styles.uploadResultItem} ${result.success ? styles.success : styles.error}`}
                                        >
                                            <span className={styles.resultFileName}>{result.originalName}</span>
                                            <span className={styles.resultStatus}>
                                                {result.success 
                                                    ? `✓ Загружен как "${result.track?.title}" - ${result.track?.artist}`
                                                    : `✗ Ошибка: ${result.error}`
                                                }
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                                <button 
                                    type="button" 
                                    className={styles.resetButton}
                                    onClick={resetForm}
                                >
                                    Загрузить еще
                                </button>
                            </div>
                        ) : (
                            <button 
                                type="submit" 
                                className={styles.submitButton}
                                disabled={isUploading || selectedFiles.length === 0}
                            >
                                Загрузить {selectedFiles.length > 0 ? `${selectedFiles.length} файл(ов)` : 'файлы'}
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </>
    );
};

export default MultiUploadAudio; 