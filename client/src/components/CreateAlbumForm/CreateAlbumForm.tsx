import React, { useState } from 'react';
import { Photo } from '../../types/post.types';
import { ImageSelector } from '../ImageSelector/ImageSelector';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import styles from './CreateAlbumForm.module.css';

interface CreateAlbumFormProps {
    onSuccess?: () => void;
    onCancel?: () => void;
}

export const CreateAlbumForm: React.FC<CreateAlbumFormProps> = ({ onSuccess, onCancel }) => {
    const { user } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPrivate, setIsPrivate] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            setError('Необходима авторизация');
            return;
        }

        if (!title.trim()) {
            setError('Введите название альбома');
            return;
        }

        if (selectedPhotos.length === 0) {
            setError('Выберите хотя бы одну фотографию');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            await api.post('/albums', {
                title: title.trim(),
                description: description.trim(),
                isPrivate,
                photoIds: selectedPhotos.map(photo => photo.id)
            });

            setTitle('');
            setDescription('');
            setIsPrivate(false);
            setSelectedPhotos([]);
            onSuccess?.();
        } catch (err) {
            console.error('Ошибка при создании альбома:', err);
            setError('Произошла ошибка при создании альбома');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.header}>
                <h3>Создание альбома</h3>
                {onCancel && (
                    <button 
                        type="button" 
                        className={styles.closeButton}
                        onClick={onCancel}
                    >
                        ×
                    </button>
                )}
            </div>

            <div className={styles.field}>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Название альбома"
                    className={styles.input}
                />
            </div>

            <div className={styles.field}>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Описание (необязательно)"
                    className={styles.textarea}
                    rows={3}
                />
            </div>

            <div className={styles.field}>
                <label className={styles.checkbox}>
                    <input
                        type="checkbox"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                    />
                    Приватный альбом
                </label>
            </div>

            <div className={styles.photoSelector}>
                <p className={styles.sectionTitle}>Выберите фотографии:</p>
                {user && (
                    <ImageSelector
                        userId={user.id}
                        selectedImages={selectedPhotos}
                        onImagesChange={setSelectedPhotos}
                    />
                )}
            </div>

            {error && (
                <div className={styles.error}>
                    {error}
                </div>
            )}

            <div className={styles.buttons}>
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Создание...' : 'Создать альбом'}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={onCancel}
                        disabled={isSubmitting}
                    >
                        Отмена
                    </button>
                )}
            </div>
        </form>
    );
}; 