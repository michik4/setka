import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import styles from './UploadAudio.module.css';
import { tokenService } from '../../utils/api';

// API URL из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Добавить константу для обложки по умолчанию
const DEFAULT_COVER_URL = '/api/music/cover/default.png';

interface UploadAudioProps {
    onTrackUploaded?: (newTrack: any) => void;
}

const UploadAudio: React.FC<UploadAudioProps> = ({ onTrackUploaded }) => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [audioFileName, setAudioFileName] = useState('');
    const [coverFileName, setCoverFileName] = useState('');
    const formRef = useRef<HTMLFormElement>(null);
    const coverPreviewRef = useRef<HTMLImageElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

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
        setAudioFileName('');
        setCoverFileName('');
        setUploadProgress(0);
        
        if (coverPreviewRef.current) {
            coverPreviewRef.current.style.display = 'none';
        }
    };

    const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAudioFileName(file.name);
        } else {
            setAudioFileName('');
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

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        
        if (!user) {
            alert('Пожалуйста, войдите в систему для загрузки треков');
            return;
        }
        
        const formData = new FormData(e.currentTarget);
        
        const audioFile = formData.get('audioFile') as File;
        if (!audioFile || !audioFile.name) {
            alert('Пожалуйста, выберите аудиофайл');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', `${API_URL}/music/upload`, true);
            
            // Получаем JWT токен
            const token = tokenService.getToken();
            
            // Удаляем withCredentials, так как используем JWT
            // xhr.withCredentials = true;
            
            xhr.setRequestHeader('Accept', 'application/json');
            
            // Добавляем токен в заголовок
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
            
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
                        
                        const coverUrl = response.coverUrl || DEFAULT_COVER_URL;
                        
                        const validTrack = {
                            id: response.id || 0,
                            title: response.title || 'Неизвестный трек',
                            artist: response.artist || 'Неизвестный исполнитель',
                            duration: response.duration || 0,
                            coverUrl: coverUrl,
                            audioUrl: `/api/music/file/${response.filename}`,
                            playCount: response.playCount || 0
                        };
                        
                        if (onTrackUploaded) {
                            onTrackUploaded(validTrack);
                        }
                        
                        setIsUploading(false);
                        closeModal();
                        resetForm();
                    } catch (parseError) {
                        console.error('[UploadAudio] Ошибка парсинга ответа:', parseError);
                        setIsUploading(false);
                        alert('Ошибка обработки ответа сервера');
                    }
                } else {
                    console.error('[UploadAudio] Ошибка при загрузке файла, статус:', xhr.status);
                    setIsUploading(false);
                    alert(`Ошибка загрузки: ${xhr.status} ${xhr.statusText}`);
                }
            };
            
            xhr.onerror = () => {
                console.error('[UploadAudio] Ошибка при загрузке файла');
                setIsUploading(false);
                alert('Ошибка соединения с сервером');
            };
            
            xhr.send(formData);
        } catch (error) {
            console.error('[UploadAudio] Ошибка при загрузке трека:', error);
            setIsUploading(false);
            alert('Произошла ошибка при загрузке. Пожалуйста, попробуйте еще раз.');
        }
    };

    return (
        <>
            <button 
                className={styles.uploadButton}
                onClick={openModal}
                aria-label="Загрузить аудио"
                title="Загрузить новый трек"
            >
                <svg 
                    className={styles.uploadButtonIcon} 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                >
                    <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
                </svg>
            </button>

            <div className={`${styles.modalOverlay} ${isModalOpen ? styles.visible : ''}`}>
                <div className={styles.modalContent} ref={modalRef}>
                    <div className={styles.modalTitle}>
                        <span>Загрузка нового трека</span>
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
                        <div className={styles.formGroup}>
                            <label htmlFor="audioFile" className={styles.label}>
                                Аудиофайл *
                            </label>
                            <div className={styles.fileInputWrap}>
                                <label htmlFor="audioFile" className={styles.fileInputLabel}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2 12.5C2 9.46 4.46 7 7.5 7H18c2.21 0 4 1.79 4 4s-1.79 4-4 4H9.5C8.12 15 7 13.88 7 12.5S8.12 10 9.5 10H17v2H9.41c-0.55 0-0.55 1 0 1H18c1.1 0 2-0.9 2-2s-0.9-2-2-2H7.5C5.57 9 4 10.57 4 12.5S5.57 16 7.5 16H17v2H7.5C4.46 18 2 15.54 2 12.5z"/>
                                    </svg>
                                    Выбрать аудиофайл
                                </label>
                                <input 
                                    type="file" 
                                    id="audioFile" 
                                    name="audioFile" 
                                    className={styles.fileInput} 
                                    accept="audio/*"
                                    onChange={handleAudioFileChange}
                                    required
                                    disabled={isUploading}
                                />
                                {audioFileName && (
                                    <div className={styles.fileName}>
                                        {audioFileName}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroupRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="title" className={styles.label}>
                                    Название трека *
                                </label>
                                <input 
                                    type="text" 
                                    id="title" 
                                    name="title" 
                                    className={styles.inputField} 
                                    required
                                    disabled={isUploading}
                                    placeholder="Введите название трека"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="artist" className={styles.label}>
                                    Исполнитель *
                                </label>
                                <input 
                                    type="text" 
                                    id="artist" 
                                    name="artist" 
                                    className={styles.inputField} 
                                    required
                                    disabled={isUploading}
                                    placeholder="Введите имя исполнителя"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="coverImage" className={styles.label}>
                                Обложка (опционально)
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

                        {isUploading && (
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
                        )}

                        <button 
                            type="submit" 
                            className={styles.submitButton}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Загрузка...' : 'Загрузить трек'}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default UploadAudio; 