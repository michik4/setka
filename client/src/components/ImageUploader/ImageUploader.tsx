import React, { useRef, useState } from 'react';
import { Photo } from '../../types/post.types';
import { API_URL } from '../../config';
import { useAuth } from '../../contexts/AuthContext';
import styles from './ImageUploader.module.css';

interface ImageUploaderProps {
    onImageUploaded: (photo: Photo) => void;
    onError: (error: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUploaded, onError }) => {
    const { user } = useAuth();
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createPreview = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async () => {
        if (!user || !selectedFile) {
            onError('Необходимо войти в систему и выбрать файл');
            return;
        }

        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append('photo', selectedFile);
            formData.append('userId', user.id.toString());

            const response = await fetch(`${API_URL}/photos`, {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка при загрузке:', errorText);
                throw new Error('Не удалось загрузить изображение');
            }

            const photo = await response.json();
            console.log('Изображение успешно загружено:', photo);
            onImageUploaded(photo);
            handleRemovePreview();
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            onError(err instanceof Error ? err.message : 'Ошибка при загрузке изображения');
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('image/')) {
            onError('Можно загружать только изображения');
            return;
        }

        setSelectedFile(file);
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

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemovePreview = () => {
        setPreviewUrl(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={styles.container}>
            {previewUrl ? (
                <div className={styles.previewContainer}>
                    <img src={previewUrl} alt="Предпросмотр" className={styles.preview} />
                    <div className={styles.previewActions}>
                        <button 
                            type="button" 
                            className={`${styles.actionButton} ${styles.uploadButton}`}
                            onClick={handleUpload}
                            disabled={isUploading}
                        >
                            {isUploading ? 'Загрузка...' : 'Загрузить'}
                        </button>
                        <button 
                            type="button" 
                            className={`${styles.actionButton} ${styles.cancelButton}`}
                            onClick={handleRemovePreview}
                            disabled={isUploading}
                        >
                            Отмена
                        </button>
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
                    />
                    <div className={styles.uploadMessage}>
                        <span className={styles.icon}>📸</span>
                        <span>Перетащите изображение сюда или кликните для выбора</span>
                    </div>
                </div>
            )}
        </div>
    );
}; 