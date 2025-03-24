import React, { useState } from 'react';
import { Photo } from '../../types/post.types';
import { ImageSelector } from '../ImageSelector/ImageSelector';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { useAuth } from '../../contexts/AuthContext';
import styles from './CreatePostForm.module.css';
import { API_URL } from '../../config';

interface CreatePostFormProps {
    onSuccess?: () => void;
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSuccess }) => {
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
            console.log('Создание поста:', {
                content: content.trim(),
                photoIds: selectedImages.map(img => img.id),
                authorId: user.id
            });

            const response = await fetch(`${API_URL}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    content: content.trim(),
                    photoIds: selectedImages.map(img => img.id),
                    authorId: user.id
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ответ сервера при ошибке:', errorText);
                throw new Error('Не удалось создать пост');
            }

            const data = await response.json();
            console.log('Пост успешно создан:', data);

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
                placeholder="Что у вас нового?"
                rows={4}
            />

            <ImageUploader
                onImageUploaded={handleImageUploaded}
                onError={handleUploadError}
            />

            <ImageSelector
                userId={user.id}
                selectedImages={selectedImages}
                onImagesChange={setSelectedImages}
            />

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