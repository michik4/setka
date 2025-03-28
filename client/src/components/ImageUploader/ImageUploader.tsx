import React, { useRef, useState } from 'react';
import { Photo } from '../../types/post.types';
import { API_URL } from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import styles from './ImageUploader.module.css';

interface PreviewFile {
    file: File;
    preview: string;
    uploading: boolean;
    error?: string;
}

interface ImageUploaderProps {
    onImageUploaded: (photo: Photo) => void;
    onError: (error: string) => void;
    albumId?: number; // Опциональный ID альбома для прямой загрузки
    onUploadComplete?: () => void; // Колбэк после завершения всех загрузок
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUploaded, onError, albumId, onUploadComplete }) => {
    const { user } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewFiles, setPreviewFiles] = useState<PreviewFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createPreview = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            setPreviewFiles(prevFiles => [...prevFiles, { file, preview: reader.result as string, uploading: false }]);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!user || previewFiles.length === 0) {
            onError('Необходимо войти в систему и выбрать файлы');
            return;
        }

        setIsUploading(true);

        try {
            const uploadedPhotos = [];
            const newPreviewFiles = [...previewFiles];
            
            // Загружаем каждый файл по отдельности
            for (let i = 0; i < newPreviewFiles.length; i++) {
                // Помечаем текущий файл как загружаемый
                newPreviewFiles[i].uploading = true;
                setPreviewFiles([...newPreviewFiles]);
                
                const formData = new FormData();
                formData.append('photo', newPreviewFiles[i].file);
                formData.append('userId', user.id.toString());
                
                // Если указан albumId, добавляем его в formData
                if (albumId) {
                    formData.append('albumId', albumId.toString());
                    formData.append('skipDefaultAlbum', 'true'); // Флаг, чтобы фото не добавлялось в "Загруженное"
                }
                
                try {
                    const response = await fetch(`${API_URL}/photos`, {
                        method: 'POST',
                        credentials: 'include',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        console.error('Ошибка при загрузке:', errorText);
                        throw new Error(`Не удалось загрузить изображение ${i+1}`);
                    }
                    
                    const photo = await response.json();
                    console.log(`Изображение ${i+1} успешно загружено:`, photo);
                    uploadedPhotos.push(photo);
                    
                    // Вызываем обработчик для каждого загруженного фото
                    onImageUploaded(photo);
                } catch (err) {
                    // Помечаем файл как ошибочный и продолжаем загрузку других файлов
                    newPreviewFiles[i].uploading = false;
                    newPreviewFiles[i].error = err instanceof Error ? err.message : 'Ошибка при загрузке';
                    setPreviewFiles([...newPreviewFiles]);
                    console.error(`Ошибка загрузки файла ${i+1}:`, err);
                }
            }
            
            // Удаляем успешно загруженные файлы из предпросмотра
            const remainingFiles = newPreviewFiles.filter(file => !file.uploading || file.error);
            setPreviewFiles(remainingFiles);
            
            console.log('Все изображения загружены:', uploadedPhotos);
            
            // Вызываем колбэк завершения загрузки
            if (onUploadComplete) {
                onUploadComplete();
            }
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            onError(err instanceof Error ? err.message : 'Ошибка при загрузке изображений');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            onError('Можно загружать только изображения');
            return;
        }

        createPreview(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            Array.from(files).forEach(file => {
                handleFileSelect(file);
            });
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            Array.from(files).forEach(file => {
                handleFileSelect(file);
            });
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemovePreview = (index: number) => {
        const newFiles = [...previewFiles];
        newFiles.splice(index, 1);
        setPreviewFiles(newFiles);
    };

    const handleRemoveAll = () => {
        setPreviewFiles([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={styles.container}>
            {previewFiles.length > 0 ? (
                <div className={styles.previewContainer}>
                    <div className={styles.previewHeader}>
                        <h4 className={styles.previewTitle}>Выбранные фотографии: {previewFiles.length}</h4>
                        <div className={styles.previewActions}>
                            <button 
                                type="button" 
                                className={`${styles.actionButton} ${styles.uploadButton}`}
                                onClick={handleUpload}
                                disabled={isUploading}
                            >
                                {isUploading ? 'Загрузка...' : 'Загрузить все'}
                            </button>
                            <button 
                                type="button" 
                                className={`${styles.actionButton} ${styles.cancelButton}`}
                                onClick={handleRemoveAll}
                                disabled={isUploading}
                            >
                                Отменить все
                            </button>
                        </div>
                    </div>
                    <div className={styles.previewFiles}>
                        {previewFiles.map((file, index) => (
                            <div key={index} className={styles.previewFile}>
                                <div className={styles.previewImageContainer}>
                                    <img 
                                        src={file.preview} 
                                        alt={`Предпросмотр ${index + 1}`} 
                                        className={styles.preview} 
                                    />
                                    {file.uploading && (
                                        <div className={styles.uploadingOverlay}>
                                            <div className={styles.spinner}></div>
                                        </div>
                                    )}
                                    {file.error && (
                                        <div className={styles.errorOverlay}>
                                            <div className={styles.errorIcon}>⚠️</div>
                                            <div className={styles.errorText}>{file.error}</div>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.fileInfo}>
                                    <span className={styles.fileName}>
                                        {file.file.name.length > 15 
                                            ? file.file.name.substring(0, 12) + '...' 
                                            : file.file.name
                                        }
                                    </span>
                                    {!file.uploading && (
                                        <button 
                                            type="button" 
                                            className={styles.removeButton}
                                            onClick={() => handleRemovePreview(index)}
                                            disabled={isUploading}
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        <div className={styles.addMoreFile} onClick={!isUploading ? handleClick : undefined}>
                            <div className={styles.addMoreIcon}>+</div>
                            <div className={styles.addMoreText}>Добавить ещё</div>
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    className={`${styles.dropzone} ${isDragging ? styles.dragging : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleInputChange}
                        className={styles.fileInput}
                        multiple
                    />
                    <div className={styles.uploadMessage}>
                        <span className={styles.icon}>📸</span>
                        <span>Перетащите изображения сюда или кликните для выбора</span>
                        <div className={styles.subMessage}>Можно выбрать несколько фотографий</div>
                    </div>
                </div>
            )}
        </div>
    );
}; 