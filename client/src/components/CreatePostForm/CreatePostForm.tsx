import React, { useState, useRef, useEffect } from 'react';
import { Photo } from '../../types/post.types';
import { Album } from '../../types/album.types';
import { Track } from '../../types/music.types';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import UploadAudio from '../UploadAudio';
import { useAuth } from '../../contexts/AuthContext';
import styles from './CreatePostForm.module.css';
import { api } from '../../utils/api';
import { PhotoSelector } from '../PhotoSelector/PhotoSelector';
import { ServerImage } from '../ServerImage/ServerImage';
import { TrackSelector } from '../TrackSelector';

interface CreatePostFormProps {
    onSuccess?: () => void;
    wallOwnerId?: number;
    groupId?: number;
}

interface AttachmentBase {
    type: 'photo' | 'album' | 'track';
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

interface TrackAttachment extends AttachmentBase {
    type: 'track';
    data: Track;
}

type Attachment = PhotoAttachment | AlbumAttachment | TrackAttachment;

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSuccess, wallOwnerId, groupId }) => {
    const { user } = useAuth();
    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPhotoSelector, setShowPhotoSelector] = useState(false);
    const [showAudioUploader, setShowAudioUploader] = useState(false);
    const [showTrackSelector, setShowTrackSelector] = useState(false);
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

    // Эффект для проверки наличия прикреплений и автоматического развертывания формы
    useEffect(() => {
        if (attachments.length > 0) {
            setIsExpanded(true);
        }
    }, [attachments.length]);

    const handleImageUploaded = async (photo: Photo) => {
        try {
            if (!uploadAlbumId) {
                console.error('ID альбома не найден');
                return;
            }

            // Проверяем количество уже прикрепленных фотографий
            const currentPhotoCount = attachments.filter(a => a.type === 'photo').length;
            if (currentPhotoCount >= 20) {
                handleUploadError('Нельзя прикрепить больше 20 фотографий к посту');
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
            
            // Обновляем состояние с новым вложением и сохраняем обновленный массив
            const updatedAttachments = [...attachments, newAttachment];
            setAttachments(updatedAttachments);
            
            // Устанавливаем состояние expanded, чтобы принудительно показать прикрепления
            setIsExpanded(true);
            
            // Сбрасываем состояние перетаскивания
            setIsDragging(false);
            
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

    const handleTrackUploaded = (track: Track) => {
        // Проверяем количество уже прикрепленных треков
        const currentTrackCount = attachments.filter(a => a.type === 'track').length;
        if (currentTrackCount >= 10) {
            setError('Нельзя прикрепить больше 10 треков к посту');
            return;
        }

        const newAttachment: TrackAttachment = { type: 'track', id: track.id, data: track };
        
        // Обновляем состояние с новым вложением
        setAttachments(prev => [...prev, newAttachment]);
        
        // Устанавливаем состояние expanded, чтобы показать прикрепления
        setIsExpanded(true);
        
        // Скрываем загрузчик аудио
        setShowAudioUploader(false);
        
        setError(null);
    };

    const handleUploadError = (errorMessage: string) => {
        setError(errorMessage);
    };

    const handleAttachmentDelete = (attachment: Attachment) => {
        setAttachments(prev => prev.filter(a => !(a.type === attachment.type && a.id === attachment.id)));
    };

    const handlePhotosAndAlbumsSelected = (photos: Photo[], albums: Album[]) => {
        // Проверяем общее количество фотографий после добавления новых
        const currentPhotoCount = attachments.filter(a => a.type === 'photo').length;
        const totalPhotos = currentPhotoCount + photos.length;
        
        if (totalPhotos > 20) {
            setError('Нельзя прикрепить больше 20 фотографий к посту');
            return;
        }

        const newAttachments: Attachment[] = [
            ...photos.map(photo => ({ type: 'photo' as const, id: photo.id, data: photo })),
            ...albums.map(album => ({ type: 'album' as const, id: album.id, data: album }))
        ];
        
        // Применяем прямое обновление состояния
        const updatedAttachments = [...attachments, ...newAttachments];
        setAttachments(updatedAttachments);
        
        // Устанавливаем состояние expanded, чтобы показать прикрепления
        setIsExpanded(true);
        
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

        // Проверяем, что это действительно покидание области, а не переход на дочерний элемент
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
        } else {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Устанавливаем состояние expanded при перетаскивании
        setIsExpanded(true);
        setIsDragging(true);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Не сбрасываем isDragging здесь, так как ImageUploader должен остаться видимым
        // для обработки загрузки файла. Он будет скрыт в handleImageUploaded
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            setError('Необходимо войти в систему');
            return;
        }

        // Проверяем наличие контента или вложений
        if (!content && attachments.length === 0) {
            setError('Добавьте текст или выберите медиа');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            console.log('Отправка поста с данными:', {
                content: content,
                attachments: attachments.map(a => ({ type: a.type, id: a.id })),
                authorId: user.id,
                ...(wallOwnerId && { wallOwnerId }),
                ...(groupId && { groupId })
            });

            // Подготавливаем данные для отправки
            const photoIds = attachments.filter((a): a is PhotoAttachment => a.type === 'photo').map(a => a.id);
            const albumIds = attachments.filter((a): a is AlbumAttachment => a.type === 'album').map(a => a.id);
            const trackIds = attachments.filter((a): a is TrackAttachment => a.type === 'track').map(a => a.id);

            // Превращаем массивы в JSON строки
            const photoIdsJson = JSON.stringify(photoIds);
            const albumIdsJson = JSON.stringify(albumIds);
            const trackIdsJson = JSON.stringify(trackIds);

            console.log('Подготовленные данные для отправки:', {
                photoIds: photoIdsJson,
                albumIds: albumIdsJson,
                trackIds: trackIdsJson
            });

            // Создаем объект данных для отправки
            const postData = {
                content: content,
                photoIds: photoIdsJson,
                albumIds: albumIdsJson,
                trackIds: trackIdsJson,
                authorId: user.id,
                ...(wallOwnerId && { wallOwnerId }),
                ...(groupId && { groupId })
            };

            console.log('Итоговые данные поста перед отправкой:', postData);

            // Отправляем запрос
            const response = await api.post('/posts', postData);
            console.log('Ответ сервера при создании поста:', response);
            
            setContent('');
            setAttachments([]);
            onSuccess?.();
        } catch (err: any) {
            console.error('Ошибка при создании поста:', err);
            setError(err.message || 'Произошла ошибка при публикации поста');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTextareaFocus = () => {
        setIsExpanded(true);
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        // Всегда разворачиваем форму при изменении текста или наличии вложений
        setIsExpanded(true);
    };

    const handleTracksSelected = (tracks: Track[]) => {
        // Проверяем количество уже прикрепленных треков
        const currentTrackCount = attachments.filter(a => a.type === 'track').length;
        const totalTracks = currentTrackCount + tracks.length;
        
        if (totalTracks > 10) {
            setError('Нельзя прикрепить больше 10 треков к посту');
            setShowTrackSelector(false);
            return;
        }

        // Добавляем выбранные треки
        if (tracks.length > 0) {
            const newAttachments = tracks.map(track => {
                return { type: 'track' as const, id: track.id, data: track };
            });
            
            // Обновляем состояние с новыми вложениями
            setAttachments(prev => [...prev, ...newAttachments]);
            
            // Устанавливаем состояние expanded, чтобы показать прикрепления
            setIsExpanded(true);
            
            // Скрываем селектор треков
            setShowTrackSelector(false);
            
            setError(null);
        } else {
            setShowTrackSelector(false);
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
    const trackAttachments = attachments.filter((a): a is TrackAttachment => a.type === 'track');
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
                    placeholder={wallOwnerId ? "Напишите что-нибудь на стене..." : (groupId ? "Написать от имени сообщества..." : "Что у вас нового?")}
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

                    {trackAttachments.length > 0 && (
                        <div className={styles.tracksPreview}>
                            {trackAttachments.map(attachment => (
                                <div key={attachment.id} className={styles.trackPreviewItem}>
                                    <div className={styles.trackCover}>
                                        <img 
                                            src={attachment.data.coverUrl} 
                                            alt={attachment.data.title}
                                            className={styles.trackCoverImage}
                                        />
                                        <button
                                            type="button"
                                            className={styles.deleteButton}
                                            onClick={() => handleAttachmentDelete(attachment)}
                                            title="Удалить трек"
                                        />
                                    </div>
                                    <div className={styles.trackInfo}>
                                        <div className={styles.trackTitle}>{attachment.data.title}</div>
                                        <div className={styles.trackArtist}>{attachment.data.artist}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            <div className={styles.mediaSection}>
                <div className={styles.attachButtons}>
                    <button
                        type="button"
                        className={styles.photoSelectorButton}
                        onClick={() => setShowPhotoSelector(true)}
                    >
                        Фото
                    </button>
                    <div className={styles.dropdownContainer}>
                        <button
                            type="button"
                            className={styles.audioSelectorButton}
                            onClick={() => setShowTrackSelector(true)}
                        >
                            Музыка
                        </button>
                        <div className={styles.dropdownContent}>
                            <button
                                type="button"
                                className={styles.dropdownItem}
                                onClick={() => setShowTrackSelector(true)}
                            >
                                Моя музыка
                            </button>
                            <button
                                type="button"
                                className={styles.dropdownItem}
                                onClick={() => setShowAudioUploader(true)}
                            >
                                Загрузить
                            </button>
                        </div>
                    </div>
                </div>

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

            {showAudioUploader && (
                <div className={styles.audioUploaderOverlay}>
                    <div className={styles.audioUploaderContainer}>
                        <div className={styles.audioUploaderHeader}>
                            <h3>Загрузка музыки</h3>
                            <button 
                                type="button" 
                                className={styles.closeButton} 
                                onClick={() => setShowAudioUploader(false)}
                            >
                                ×
                            </button>
                        </div>
                        <UploadAudio onTrackUploaded={handleTrackUploaded} />
                    </div>
                </div>
            )}

            {showTrackSelector && (
                <div className={styles.audioUploaderOverlay}>
                    <TrackSelector
                        userId={user.id}
                        onSelect={handleTracksSelected}
                        onCancel={() => setShowTrackSelector(false)}
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
                                {(photoAttachments.length > 0 && (albumAttachments.length > 0 || trackAttachments.length > 0)) && ', '}
                                {albumAttachments.length > 0 && `${albumAttachments.length} альбом${albumAttachments.length > 1 ? 'а' : ''}`}
                                {(albumAttachments.length > 0 && trackAttachments.length > 0) && ', '}
                                {trackAttachments.length > 0 && `${trackAttachments.length} трек${trackAttachments.length > 1 ? 'а' : ''}`}
                            </>
                        )}
                    </span>
                </div>
            )}
        </form>
    );
}; 