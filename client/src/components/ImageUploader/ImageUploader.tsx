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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const createPreview = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleUpload = async (file: File) => {
        if (!user) {
            onError('Необходимо войти в систему');
            return;
        }

        if (!file.type.startsWith('image/')) {
            onError('Можно загружать только изображения');
            return;
        }

        createPreview(file);
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('userId', user.id.toString());

        setIsUploading(true);

        try {
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
            setPreviewUrl(null); // Очищаем превью после успешной загрузки
        } catch (err) {
            console.error('Ошибка загрузки:', err);
            onError(err instanceof Error ? err.message : 'Ошибка при загрузке изображения');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            await handleUpload(file);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await handleUpload(file);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleRemovePreview = () => {
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className={styles.container}>
            {previewUrl ? (
                <div className={styles.previewContainer}>
                    <img src={previewUrl} alt="Предпросмотр" className={styles.preview} />
                    <button 
                        type="button" 
                        className={styles.removeButton}
                        onClick={handleRemovePreview}
                        disabled={isUploading}
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div
                    className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${isUploading ? styles.uploading : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={handleClick}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className={styles.fileInput}
                    />
                    {isUploading ? (
                        <div className={styles.uploadingMessage}>
                            <div className={styles.spinner} />
                            <span>Загрузка...</span>
                        </div>
                    ) : (
                        <div className={styles.uploadMessage}>
                            <span className={styles.icon}>📸</span>
                            <span>Перетащите изображение сюда или кликните для выбора</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}; 