import React, { useState, useRef, useEffect } from 'react';
import { Photo } from '../../types/post.types';
import { Album } from '../../types/album.types';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import { useAuth } from '../../contexts/AuthContext';
import styles from './CreatePostForm.module.css';
import { api } from '../../utils/api';
import { PhotoSelector } from '../PhotoSelector/PhotoSelector';
import { ServerImage } from '../ServerImage/ServerImage';

interface CreatePostFormProps {
    onSuccess?: () => void;
    wallOwnerId?: number;
}

interface AttachmentBase {
    type: 'photo' | 'album';
    id: number;
}

interface PhotoAttachment extends AttachmentBase {
    type: 'photo';
    data: Photo;
}

interface AlbumAttachment extends AttachmentBase {
    type: 'album';
    data: Album;
}

type Attachment = PhotoAttachment | AlbumAttachment;

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSuccess, wallOwnerId }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPhotoSelector, setShowPhotoSelector] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [uploadAlbumId, setUploadAlbumId] = useState<number | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        let isSubscribed = true;

        const createUploadAlbum = async () => {
            if (!user) return;
            
            try {
                // Проверяем существование альбома "Загруженное"
                const response = await api.get(`/albums/user/${user.id}`);
                console.log('Ответ сервера при получении альбомов:', response);

                if (!isSubscribed) return;

                // Проверяем структуру ответа
                if (!Array.isArray(response)) {
                    throw new Error('Неверный формат ответа сервера');
                }

                // Находим альбом "Загруженное"
                const albums = response;
                const uploadAlbum = albums.find((album: Album) => album.title === 'Загруженное');
                console.log('Поиск альбома "Загруженное":', uploadAlbum);
                
                if (uploadAlbum) {
                    console.log('Найден существующий альбом:', uploadAlbum);
                    if (isSubscribed) {
                        setUploadAlbumId(uploadAlbum.id);
                    }
                } else {
                    console.log('Создаем новый альбом "Загруженное"');
                    // Создаем новый альбом если не существует
                    const newAlbumResponse = await api.post('/albums', {
                        title: 'Загруженное',
                        description: 'Автоматически загруженные фотографии',
                        isPrivate: true,
                        userId: user.id
                    });
                    console.log('Ответ сервера при создании альбома:', newAlbumResponse);

                    if (!newAlbumResponse) {
                        throw new Error('Нет ответа от сервера при создании альбома');
                    }

                    if (isSubscribed) {
                        setUploadAlbumId(newAlbumResponse.id);
                    }
                    console.log('Создан новый альбом:', newAlbumResponse);
                }
            } catch (error) {
                if (!isSubscribed) return;

                console.error('Ошибка при создании/получении альбома:', error);
                if (error instanceof Error) {
                    console.error('Детали ошибки:', error.message);
                }
                if (error && typeof error === 'object' && 'response' in error) {
                    const apiError = error as any;
                    console.error('Ответ сервера с ошибкой:', {
                        status: apiError.response?.status,
                        data: apiError.response?.data,
                        headers: apiError.response?.headers
                    });
                }
            }
        };

        createUploadAlbum();

        return () => {
            isSubscribed = false;
        };
    }, [user]);

    const handleImageUploaded = async (photo: Photo) => {
        try {
            if (!uploadAlbumId) {
                console.error('ID альбома не найден');
                return;
            }

            console.log('Начинаем добавление фото в альбом:', { 
                photoId: photo.id, 
                albumId: uploadAlbumId,
                photo: photo 
            });
            
            // Добавляем фото в альбом "Загруженное"
            const addToAlbumResponse = await api.post(`/albums/${uploadAlbumId}/photos`, {
                photoIds: [photo.id]
            });
            
            console.log('Ответ сервера при добавлении фото в альбом:', addToAlbumResponse);

            if (!addToAlbumResponse) {
                throw new Error('Нет ответа от сервера при добавлении фото в альбом');
            }

            console.log('Фото успешно добавлено в альбом. Обновляем UI...');

            const newAttachment: PhotoAttachment = { type: 'photo', id: photo.id, data: photo };
            setAttachments(prev => {
                const newAttachments = [...prev, newAttachment];
                console.log('Обновленные вложения:', newAttachments);
                return newAttachments;
            });
            setError(null);
            
            console.log('Процесс добавления фото завершен успешно');
        } catch (err) {
            console.error('Ошибка при добавлении фото в альбом:', err);
            if (err && typeof err === 'object' && 'response' in err) {
                const apiError = err as any;
                console.error('Детали ошибки от сервера:', {
                    status: apiError.response?.status,
                    data: apiError.response?.data,
                    headers: apiError.response?.headers
                });
            }
            handleUploadError('Не удалось добавить фото в альбом');
        }
    };

    const handleUploadError = (errorMessage: string) => {
        setError(errorMessage);
    };

    const handleAttachmentDelete = (attachment: Attachment) => {
        setAttachments(prev => prev.filter(a => !(a.type === attachment.type && a.id === attachment.id)));
    };

    const handlePhotosAndAlbumsSelected = (photos: Photo[], albums: Album[]) => {
        const newAttachments: Attachment[] = [
            ...photos.map(photo => ({ type: 'photo' as const, id: photo.id, data: photo })),
            ...albums.map(album => ({ type: 'album' as const, id: album.id, data: album }))
        ];
        
        setAttachments(prev => [...prev, ...newAttachments]);
        setShowPhotoSelector(false);
        setError(null);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Проверяем, что курсор действительно покинул форму
        const rect = formRef.current?.getBoundingClientRect();
        if (rect) {
            const { clientX, clientY } = e;
            if (
                clientX <= rect.left ||
                clientX >= rect.right ||
                clientY <= rect.top ||
                clientY >= rect.bottom
            ) {
                setIsDragging(false);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            setError('Необходимо войти в систему');
            return;
        }

        if (!content.trim() && attachments.length === 0) {
            setError('Добавьте текст или выберите медиа');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const endpoint = wallOwnerId ? '/wall' : '/posts';
            const body = {
                content: content.trim(),
                photoIds: attachments
                    .filter((a): a is PhotoAttachment => a.type === 'photo')
                    .map(a => a.id),
                albumIds: attachments
                    .filter((a): a is AlbumAttachment => a.type === 'album')
                    .map(a => a.id),
                authorId: user.id,
                ...(wallOwnerId && { wallOwnerId })
            };

            await api.post(endpoint, body);
            setContent('');
            setAttachments([]);
            onSuccess?.();
        } catch (err) {
            console.error('Ошибка при создании поста:', err);
            setError(err instanceof Error ? err.message : 'Произошла ошибка');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTextareaFocus = () => {
        setIsExpanded(true);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        if (e.target.value.trim() || attachments.length > 0) {
            setIsExpanded(true);
        }
    };

    if (!user) {
        return (
            <div className={styles.error}>
                Необходимо войти в систему для создания постов
            </div>
        );
    }

    const photoAttachments = attachments.filter((a): a is PhotoAttachment => a.type === 'photo');
    const albumAttachments = attachments.filter((a): a is AlbumAttachment => a.type === 'album');
    const hasContent = content.trim().length > 0 || attachments.length > 0;

    return (
        <form 
            className={`${styles.form} ${isDragging ? styles.dragging : ''}`}
            onSubmit={handleSubmit}
            ref={formRef}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className={styles.textareaContainer}>
                <textarea
                    className={styles.textarea}
                    value={content}
                    onChange={handleTextareaChange}
                    onFocus={handleTextareaFocus}
                    placeholder={wallOwnerId ? "Напишите что-нибудь на стене..." : "Что у вас нового?"}
                    rows={isExpanded ? 4 : 1}
                />
            </div>

            {isDragging && (
                <ImageUploader
                    onImageUploaded={handleImageUploaded}
                    onError={handleUploadError}
                />
            )}

            {isExpanded && (
                <>
                    {photoAttachments.length > 0 && (
                        <div className={styles.preview}>
                            <PhotoGrid 
                                photos={photoAttachments.map(a => a.data)}
                                onPhotoDelete={(photo) => handleAttachmentDelete({ type: 'photo', id: photo.id, data: photo })}
                                canDelete={true}
                                isEditing={true}
                            />
                        </div>
                    )}

                    {albumAttachments.length > 0 && (
                        <div className={styles.albumsPreview}>
                            {albumAttachments.map(attachment => (
                                <div key={attachment.id} className={styles.albumPreviewItem}>
                                    <div className={styles.albumCover}>
                                        {attachment.data.photos[0] && (
                                            <ServerImage
                                                path={attachment.data.photos[attachment.data.photos.length - 1].path}
                                                alt={attachment.data.title}
                                                className={styles.albumCoverImage}
                                            />
                                        )}
                                        <button
                                            type="button"
                                            className={styles.deleteButton}
                                            onClick={() => handleAttachmentDelete(attachment)}
                                            title="Удалить альбом"
                                        />
                                    </div>
                                    <div className={styles.albumInfo}>
                                        <div className={styles.albumTitle}>{attachment.data.title}</div>
                                        <div className={styles.albumCount}>
                                            {attachment.data.photosCount} фото
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <div className={styles.mediaSection}>
                <button
                    type="button"
                    className={styles.photoSelectorButton}
                    onClick={() => setShowPhotoSelector(true)}
                >
                    Прикрепить
                </button>

                {hasContent && (
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isSubmitting || (!content.trim() && attachments.length === 0)}
                    >
                        {isSubmitting ? 'Публикация...' : 'Опубликовать'}
                    </button>
                )}
            </div>

            {showPhotoSelector && (
                <div className={styles.photoSelectorOverlay}>
                    <PhotoSelector
                        userId={user.id}
                        onSelect={handlePhotosAndAlbumsSelected}
                        onCancel={() => setShowPhotoSelector(false)}
                        multiple={true}
                    />
                </div>
            )}

            {error && (
                <div className={styles.error}>
                    {error}
                </div>
            )}

            {isExpanded && (
                <div className={styles.footer}>
                    <span className={styles.attachmentCount}>
                        {attachments.length > 0 && (
                            <>
                                {photoAttachments.length > 0 && `${photoAttachments.length} фото`}
                                {photoAttachments.length > 0 && albumAttachments.length > 0 && ', '}
                                {albumAttachments.length > 0 && `${albumAttachments.length} альбом${albumAttachments.length > 1 ? 'а' : ''}`}
                            </>
                        )}
                    </span>
                </div>
            )}
        </form>
    );
}; 