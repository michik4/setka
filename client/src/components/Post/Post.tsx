import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Post as PostType } from '../../types/post.types';
import { Photo } from '../../types/post.types';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { ImageSelector } from '../ImageSelector/ImageSelector';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import styles from './Post.module.css';
import { ServerImage } from '../ServerImage/ServerImage';

interface PostProps {
    post: PostType;
    onDelete?: () => void;
}

export const Post: React.FC<PostProps> = ({ post, onDelete }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [editedPhotos, setEditedPhotos] = useState<Photo[]>(post.photos || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Автор может редактировать свой пост
    const canEdit = user && user.id === post.authorId;
    // Автор и владелец стены могут удалять посты
    const canDelete = user && (user.id === post.authorId || (post.wallOwnerId && user.id === post.wallOwnerId));

    const handleDelete = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) {
            return;
        }

        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;
            await api.delete(endpoint);
            onDelete?.();
        } catch (err) {
            console.error('Ошибка при удалении поста:', err);
            setError('Не удалось удалить пост');
        }
    };

    const handleEdit = async () => {
        if (!isEditing) {
            setIsEditing(true);
            return;
        }

        if (editedContent.trim() === '' && editedPhotos.length === 0) {
            setError('Пост не может быть пустым');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;
            await api.put(endpoint, { 
                content: editedContent.trim(),
                photoIds: editedPhotos.map(photo => photo.id)
            });
            setIsEditing(false);
            // Обновляем пост локально
            post.content = editedContent.trim();
            post.photos = editedPhotos;
        } catch (err) {
            console.error('Ошибка при редактировании поста:', err);
            setError('Не удалось отредактировать пост');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhotoDelete = async (photo: Photo) => {
        try {
            // Отвязываем фотографию от поста вместо её удаления
            await api.delete(`/photos/${photo.id}/posts/${post.id}`);
            // Обновляем фотографии локально
            setEditedPhotos(prev => prev.filter(p => p.id !== photo.id));
            if (!isEditing) {
                post.photos = post.photos.filter(p => p.id !== photo.id);
            }
        } catch (err) {
            console.error('Ошибка при удалении фотографии из поста:', err);
            alert('Не удалось удалить фотографию из поста');
        }
    };

    const handleImageUploaded = (photo: Photo) => {
        setEditedPhotos(prev => [...prev, photo]);
        setError(null);
    };

    return (
        <div className={styles.post}>
            <div className={styles.header}>
                <div className={styles.authorInfo}>
                    <ServerImage
                        path={post.author.avatar?.path}
                        alt={`${post.author.firstName} ${post.author.lastName}`}
                        className={styles.authorAvatar}
                    />
                    <Link to={`/users/${post.author.id}`} className={styles.author}>
                        {post.author.firstName} {post.author.lastName}
                    </Link>
                </div>
                <div className={styles.date}>
                    {new Date(post.createdAt).toLocaleString()}
                </div>
            </div>
            
            {isEditing ? (
                <div className={styles.editContainer}>
                    <textarea
                        className={styles.editTextarea}
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={4}
                    />

                    <div className={styles.editPhotos}>
                        <PhotoGrid 
                            photos={editedPhotos}
                            onPhotoDelete={handlePhotoDelete}
                            canDelete={true}
                        />
                        
                        <ImageUploader
                            onImageUploaded={handleImageUploaded}
                            onError={(err) => setError(err)}
                        />

                        {user && (
                            <ImageSelector
                                userId={user.id}
                                selectedImages={editedPhotos}
                                onImagesChange={setEditedPhotos}
                            />
                        )}
                    </div>

                    {error && <div className={styles.error}>{error}</div>}
                    <div className={styles.editButtons}>
                        <button
                            className={`${styles.actionButton} ${styles.cancelButton}`}
                            onClick={() => {
                                setIsEditing(false);
                                setEditedContent(post.content);
                                setEditedPhotos(post.photos || []);
                                setError(null);
                            }}
                            disabled={isSubmitting}
                        >
                            Отмена
                        </button>
                        <button
                            className={`${styles.actionButton} ${styles.saveButton}`}
                            onClick={handleEdit}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {post.content && (
                        <div className={styles.content}>
                            {post.content}
                        </div>
                    )}

                    {post.photos && post.photos.length > 0 && (
                        <PhotoGrid 
                            photos={post.photos} 
                            onPhotoDelete={canDelete ? handlePhotoDelete : undefined}
                            canDelete={Boolean(canDelete)}
                        />
                    )}
                </>
            )}

            <div className={styles.footer}>
                <div className={styles.actions}>
                    <button className={styles.actionButton}>
                        ❤️ {post.likesCount || 0}
                    </button>
                    <button className={styles.actionButton}>
                        💬 {post.commentsCount || 0}
                    </button>
                    <button className={styles.actionButton}>
                        🔄 {post.sharesCount || 0}
                    </button>
                </div>

                <div className={styles.modifyButtons}>
                    {canEdit && (
                        <button
                            className={`${styles.actionButton} ${styles.editButton}`}
                            onClick={handleEdit}
                            disabled={isSubmitting}
                        >
                            {isEditing ? (isSubmitting ? 'Сохранение...' : 'Сохранить') : 'Редактировать'}
                        </button>
                    )}
                    {canDelete && (
                        <button
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            onClick={handleDelete}
                        >
                            Удалить
                        </button>
                    )}
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}
        </div>
    );
};