import React, { useState } from 'react';
import { Photo } from '../../types/post.types';
import { ImageSelector } from '../ImageSelector/ImageSelector';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import { useAuth } from '../../contexts/AuthContext';
import styles from './CreatePostForm.module.css';
import { api } from '../../utils/api';

interface CreatePostFormProps {
    onSuccess?: () => void;
    wallOwnerId?: number;
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSuccess, wallOwnerId }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [selectedImages, setSelectedImages] = useState<Photo[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageUploaded = (photo: Photo) => {
        setSelectedImages(prev => [...prev, photo]);
        setError(null);
    };

    const handleUploadError = (errorMessage: string) => {
        setError(errorMessage);
    };

    const handlePhotoDelete = async (photo: Photo) => {
        setSelectedImages(prev => prev.filter(p => p.id !== photo.id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            setError('Необходимо войти в систему');
            return;
        }

        if (!content.trim() && selectedImages.length === 0) {
            setError('Добавьте текст или выберите изображения');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const endpoint = wallOwnerId ? '/wall' : '/posts';
            const body = {
                content: content.trim(),
                photoIds: selectedImages.map(img => img.id),
                authorId: user.id,
                ...(wallOwnerId && { wallOwnerId })
            };

            await api.post(endpoint, body);
            setContent('');
            setSelectedImages([]);
            onSuccess?.();
        } catch (err) {
            console.error('Ошибка при создании поста:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!user) {
        return (
            <div className={styles.error}>
                Необходимо войти в систему для создания постов
            </div>
        );
    }

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <textarea
                className={styles.textarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={wallOwnerId ? "Напишите что-нибудь на стене..." : "Что у вас нового?"}
                rows={4}
            />

            {selectedImages.length > 0 && (
                <div className={styles.preview}>
                    <PhotoGrid 
                        photos={selectedImages}
                        onPhotoDelete={handlePhotoDelete}
                        canDelete={true}
                    />
                </div>
            )}

            <div className={styles.mediaSection}>
                <ImageUploader
                    onImageUploaded={handleImageUploaded}
                    onError={handleUploadError}
                />

                <ImageSelector
                    userId={user.id}
                    selectedImages={selectedImages}
                    onImagesChange={setSelectedImages}
                />
            </div>

            {error && (
                <div className={styles.error}>
                    {error}
                </div>
            )}

            <div className={styles.footer}>
                <span className={styles.imageCount}>
                    Выбрано изображений: {selectedImages.length}
                </span>
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting || (!content.trim() && selectedImages.length === 0)}
                >
                    {isSubmitting ? 'Публикация...' : 'Опубликовать'}
                </button>
            </div>
        </form>
    );
}; 