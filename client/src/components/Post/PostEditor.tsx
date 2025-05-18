import React, { useState, useEffect } from 'react';
import { Photo } from '../../types/post.types';
import { Track, MusicAlbum } from '../../types/music.types';
import { Album } from '../../types/album.types';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { PhotoSelector } from '../PhotoSelector/PhotoSelector';
import { TrackSelector } from '../TrackSelector';
import { api } from '../../utils/api';
import MusicAlbumSelector from '../MusicAlbumSelector/MusicAlbumSelector';
import UniversalMusicAlbumItem from '../UniversalAlbumItem/UniversalAlbumItem';
import UniversalTrackItem from '../UniversalTrackItem/UniversalTrackItem';
import { Button } from '@mui/material';
import { AddAPhoto, MusicNote, Album as AlbumIcon, LibraryMusic, Close } from '@mui/icons-material';
import { ServerImage } from '../ServerImage/ServerImage';
import styles from './Post.module.css';

// Компонент для предпросмотра отредактированного поста
const PostPreview: React.FC<{
    content: string;
    photos: Photo[];
    tracks: Track[];
    albums?: Album[];
    musicAlbums?: MusicAlbum[];
    author: any;
    createdAt: string;
    savedTrackIds?: number[];
}> = ({ content, photos, tracks, albums = [], musicAlbums = [], author, createdAt, savedTrackIds = [] }) => {
    return (
        <div className={styles.previewPost}>
            <div className={styles.postHeader}>
                <div className={styles.authorInfo}>
                    <div className={styles.authorAvatar}>
                        {author.avatar ? (
                            <ServerImage
                                path={author.avatar.path}
                                alt={`${author.firstName} ${author.lastName}`}
                                className={styles.authorAvatar}
                            />
                        ) : (
                            <div className={styles.defaultAvatar}>
                                {`${author.firstName.charAt(0)}${author.lastName.charAt(0)}`}
                            </div>
                        )}
                    </div>
                    <div className={styles.authorDetails}>
                        <div className={styles.nameAndGroup}>
                            <span className={styles.authorName}>
                                {author.firstName} {author.lastName}
                            </span>
                        </div>
                        <div className={styles.postTime}>
                            {new Date(createdAt).toLocaleString('ru', {
                                day: 'numeric',
                                month: 'short',
                                hour: 'numeric',
                                minute: 'numeric'
                            })}
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.content}>{content}</div>

            {photos.length > 0 && (
                <PhotoGrid
                    photos={photos.filter(photo => !photo.isDeleted)}
                    onPhotoClick={() => { }}
                />
            )}

            {albums.length > 0 && (
                <div className={styles.albumsPreview}>
                    <h4 className={styles.albumsPreviewTitle}>Фотоальбомы ({albums.length})</h4>
                    <div className={styles.albumGrid}>
                        {albums.map(album => (
                            <div key={album.id} className={styles.albumPreviewItem}>
                                <div className={styles.albumPreviewImage}>
                                    {album.photos.length > 0 && (
                                        <ServerImage path={album.photos[0].path} alt={album.title} />
                                    )}
                                </div>
                                <div className={styles.albumPreviewInfo}>
                                    <div className={styles.albumPreviewTitle}>{album.title}</div>
                                    <div className={styles.albumPreviewCount}>{album.photosCount} фото</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tracks.length > 0 && (
                <div className={styles.tracks}>
                    {tracks.map((track, index) => (
                        <UniversalTrackItem
                            key={`preview-track-${track.id}-${index}`}
                            track={track}
                            variant="post"
                            isInLibrary={savedTrackIds.includes(track.id)}
                            onLibraryStatusChange={() => { }}
                        />
                    ))}
                </div>
            )}

            {musicAlbums && musicAlbums.length > 0 && (
                <div className={styles.musicAlbumsPreview}>
                    <div className={styles.musicAlbumGrid}>
                        {musicAlbums.map((album, index) => (
                            <UniversalMusicAlbumItem
                                key={`preview-album-${album.id}-${index}`}
                                album={album}
                                variant="post"
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className={styles.footer}>
                <div className={`${styles.actions} postActionsBar`}>
                    <button
                        className={`${styles.actionButton} ${styles.likeButton} postActionItem`}
                        disabled={true}
                        title="Нравится"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </button>
                    <button
                        className={`${styles.actionButton} postActionItem`}
                        disabled={true}
                        title="Комментарии"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

interface PostEditorProps {
    post: {
        id: number;
        content?: string;
        photos: Photo[];
        tracks: Track[];
        albums: Album[];
        musicAlbums: MusicAlbum[];
        author: any;
        createdAt: string;
        wallOwnerId?: number;
    };
    savedTrackIds: number[];
    onCancel: () => void;
    onSave: (postData: {
        content: string;
        photos: Photo[];
        tracks: Track[];
        albums: Album[];
        musicAlbums: MusicAlbum[];
    }) => Promise<void>;
    userId: number;
}

const PostEditor: React.FC<PostEditorProps> = ({ post, savedTrackIds, onCancel, onSave, userId }) => {
    const [editedContent, setEditedContent] = useState(post.content || '');
    const [editedPhotos, setEditedPhotos] = useState<Photo[]>(post.photos || []);
    const [editedTracks, setEditedTracks] = useState<Track[]>(post.tracks || []);
    const [editedPhotoAlbums, setEditedPhotoAlbums] = useState<Album[]>(post.albums || []);
    const [editedMusicAlbums, setEditedMusicAlbums] = useState<MusicAlbum[]>(post.musicAlbums || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Модальные окна
    const [showPhotoSelector, setShowPhotoSelector] = useState(false);
    const [showTrackSelector, setShowTrackSelector] = useState(false);
    const [showPhotoAlbumSelector, setShowPhotoAlbumSelector] = useState(false);
    const [showMusicAlbumSelector, setShowMusicAlbumSelector] = useState(false);

    // Обработчик для сохранения отредактированного поста
    const handleSave = async () => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        setError(null);
        
        try {
            // Фильтруем только не удаленные фотографии
            const activePhotos = editedPhotos.filter(photo => !photo.isDeleted);

            // Фильтруем только альбомы с неудаленными фотографиями
            const nonEmptyAlbums = editedPhotoAlbums.filter(album => {
                if (!album.photos || album.photos.length === 0) return false;
                const activePhotos = album.photos.filter(photo => !photo.isDeleted);
                return activePhotos.length > 0;
            });
            
            // Проверяем наличие пустых альбомов
            if (editedPhotoAlbums.length !== nonEmptyAlbums.length) {
                setError('Пустые альбомы или альбомы только с удаленными фотографиями не будут добавлены к посту');
                setEditedPhotoAlbums(nonEmptyAlbums);
            }

            // Проверяем наличие контента или вложений
            if (!editedContent.trim() && activePhotos.length === 0 && editedTracks.length === 0 &&
                nonEmptyAlbums.length === 0 && editedMusicAlbums.length === 0) {
                setError('Добавьте текст или выберите медиа. Пустые альбомы и альбомы только с удаленными фотографиями не считаются валидным вложением.');
                setIsSubmitting(false);
                return;
            }

            // Вызываем функцию сохранения из родительского компонента
            await onSave({
                content: editedContent.trim(),
                photos: activePhotos,
                tracks: editedTracks,
                albums: nonEmptyAlbums,
                musicAlbums: editedMusicAlbums
            });
        } catch (err) {
            console.error('Ошибка при сохранении поста:', err);
            setError('Не удалось сохранить пост');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Обработчик загрузки изображений
    const handleImageUploaded = async (photo: Photo) => {
        // Проверяем, не превышает ли общее количество фотографий максимально допустимое (20)
        if (editedPhotos.length >= 20) {
            setError('Достигнуто максимальное количество фотографий (20)');
            return;
        }

        try {
            // Находим или создаем альбом "Загруженное"
            const uploadAlbum = await findOrCreateUploadAlbum();

            if (!uploadAlbum) {
                setError('Не удалось найти или создать альбом для загрузки фотографий');
                return;
            }

            // Добавляем фото в альбом "Загруженное" 
            console.log('Добавляем фото в альбом "Загруженное":', {
                photoId: photo.id,
                albumId: uploadAlbum.id
            });

            const addToAlbumResponse = await api.post(`/albums/${uploadAlbum.id}/photos`, {
                photoIds: [photo.id]
            });

            if (!addToAlbumResponse) {
                throw new Error('Нет ответа от сервера при добавлении фото в альбом');
            }

            // Добавляем новую фотографию к списку
            setEditedPhotos(prev => [...prev, photo]);
            setError(null);

        } catch (err) {
            console.error('Ошибка при загрузке или добавлении фотографии:', err);
            setError('Не удалось добавить фотографию');
        }
    };

    // Функция для поиска или создания альбома "Загруженное"
    const findOrCreateUploadAlbum = async () => {
        if (!userId) return null;

        try {
            // Получаем все альбомы пользователя
            const response = await api.get(`/users/${userId}/albums`);
            const albums = response.data || response;

            // Ищем альбом "Загруженное"
            let uploadAlbum = albums.find((album: Album) => album.title === 'Загруженное');

            if (uploadAlbum) {
                console.log('Найден существующий альбом:', uploadAlbum);
                return uploadAlbum;
            } else {
                console.log('Создаем новый альбом "Загруженное"');
                // Создаем новый альбом если не существует
                const newAlbumResponse = await api.post('/albums', {
                    title: 'Загруженное',
                    description: 'Автоматически загруженные фотографии',
                    isPrivate: true,
                    userId: userId
                });

                if (!newAlbumResponse) {
                    throw new Error('Нет ответа от сервера при создании альбома');
                }

                return newAlbumResponse;
            }
        } catch (error) {
            console.error('Ошибка при поиске или создании альбома:', error);
            return null;
        }
    };

    // Удаление фото из списка
    const handleEditPhotoRemove = (photo: Photo) => {
        setEditedPhotos(prev => prev.filter(p => p.id !== photo.id));
        setError(null);
    };

    // Переупорядочивание фотографий
    const handlePhotosReorder = (reorderedPhotos: Photo[]) => {
        setEditedPhotos(reorderedPhotos);
        setError(null);
        console.log('Порядок фотографий изменен:', reorderedPhotos.map(p => p.id));
    };

    // Выбор фотографий из галереи
    const handlePhotoSelection = (photos: Photo[]) => {
        // Добавляем выбранные фотографии к уже имеющимся
        const newPhotos = [...editedPhotos];
        const totalPhotos = newPhotos.length + photos.length;
        
        if (totalPhotos > 20) {
            setError(`Максимальное количество фотографий в посте: 20. Выбрано: ${totalPhotos}`);
            // Добавляем только часть фотографий до лимита
            const availableSlots = 20 - newPhotos.length;
            if (availableSlots > 0) {
                newPhotos.push(...photos.slice(0, availableSlots));
            }
        } else {
            // Добавляем все выбранные фотографии
            newPhotos.push(...photos);
            setError(null);
        }

        setEditedPhotos(newPhotos);
        setShowPhotoSelector(false);
    };

    // Выбор треков
    const handleTracksSelected = (tracks: Track[]) => {
        const currentTrackCount = editedTracks.length;
        const totalTracks = currentTrackCount + tracks.length;

        if (totalTracks > 10) {
            setError(`Максимальное количество треков в посте: 10. Выбрано: ${totalTracks}`);
            const availableSlots = 10 - currentTrackCount;
            if (availableSlots > 0) {
                setEditedTracks(prev => [...prev, ...tracks.slice(0, availableSlots)]);
            }
        } else {
            setEditedTracks(prev => [...prev, ...tracks]);
            setError(null);
        }

        setShowTrackSelector(false);
    };

    // Удаление трека
    const handleTrackRemove = (track: Track) => {
        setEditedTracks(prev => prev.filter(t => t.id !== track.id));
    };

    // Выбор фотоальбомов
    const handlePhotoAlbumsSelected = (albums: Album[]) => {
        const nonEmptyAlbums = albums.filter(album => {
            if (!album.photos || album.photos.length === 0) return false;
            const activePhotos = album.photos.filter(photo => !photo.isDeleted);
            return activePhotos.length > 0;
        });
        
        if (albums.length !== nonEmptyAlbums.length) {
            setError('Пустые альбомы или альбомы только с удаленными фотографиями не будут добавлены к посту');
        }
        
        const currentAlbumCount = editedPhotoAlbums.length;
        if (currentAlbumCount + nonEmptyAlbums.length > 5) {
            setError(`Максимальное количество фотоальбомов в посте: 5. Выбрано: ${currentAlbumCount + nonEmptyAlbums.length}`);
            const availableSlots = 5 - currentAlbumCount;
            if (availableSlots > 0) {
                setEditedPhotoAlbums(prev => [...prev, ...nonEmptyAlbums.slice(0, availableSlots)]);
            }
        } else {
            setEditedPhotoAlbums(prev => [...prev, ...nonEmptyAlbums]);
            if (albums.length === nonEmptyAlbums.length) {
                setError(null);
            }
        }

        setShowPhotoAlbumSelector(false);
    };

    // Удаление фотоальбома
    const handlePhotoAlbumRemove = (album: Album) => {
        setEditedPhotoAlbums(prev => prev.filter(a => a.id !== album.id));
    };

    // Выбор музыкальных альбомов
    const handleMusicAlbumsSelected = (albums: MusicAlbum[]) => {
        if (albums.length > 5) {
            setError(`Максимальное количество музыкальных альбомов в посте: 5. Выбрано: ${albums.length}`);
            setEditedMusicAlbums(albums.slice(0, 5));
        } else {
            setEditedMusicAlbums(albums);
            setError(null);
        }

        setShowMusicAlbumSelector(false);
    };

    // Удаление музыкального альбома
    const handleMusicAlbumRemove = (album: MusicAlbum) => {
        setEditedMusicAlbums(prev => prev.filter(a => a.id !== album.id));
    };

    return (
        <div className={styles.editContainer}>
            <textarea
                className={styles.editTextarea}
                value={editedContent}
                onChange={e => setEditedContent(e.target.value)}
                placeholder="Что у вас нового?"
            />

            {/* Предпросмотр поста */}
            <div className={styles.postPreviewSection}>
                <h4 className={styles.previewTitle}>Предпросмотр</h4>
                <PostPreview
                    content={editedContent}
                    photos={editedPhotos}
                    tracks={editedTracks}
                    albums={editedPhotoAlbums}
                    musicAlbums={editedMusicAlbums}
                    author={post.author}
                    createdAt={post.createdAt}
                    savedTrackIds={savedTrackIds}
                />
            </div>

            {/* Отображение уже прикрепленных вложений */}
            {(editedPhotos.length > 0 || editedTracks.length > 0 || editedPhotoAlbums.length > 0 || editedMusicAlbums.length > 0) && (
                <div className={styles.attachmentsPreview}>
                    <h5 className={styles.attachmentsTitle}>Прикрепленные файлы</h5>

                    {editedPhotos.length > 0 && (
                        <div className={styles.attachmentSection}>
                            <h6 className={styles.attachmentSectionTitle}>
                                <AddAPhoto fontSize="small" style={{ marginRight: 5 }} />
                                Фотографии ({editedPhotos.length})
                            </h6>
                            <PhotoGrid
                                photos={editedPhotos.filter(photo => !photo.isDeleted)}
                                onPhotoClick={(photo, index) => { }}
                                isEditing={true}
                                canDelete={true}
                                onPhotoDelete={handleEditPhotoRemove}
                                onPhotosReorder={handlePhotosReorder}
                            />
                        </div>
                    )}

                    {editedPhotoAlbums.length > 0 && (
                        <div className={styles.attachmentSection}>
                            <h6 className={styles.attachmentSectionTitle}>
                                <AlbumIcon fontSize="small" style={{ marginRight: 5 }} />
                                Фотоальбомы ({editedPhotoAlbums.length})
                            </h6>
                            <div className={styles.albumsList}>
                                {editedPhotoAlbums.map((album, index) => (
                                    <div key={`album-${album.id}-${index}`} className={styles.albumItem}>
                                        <div className={styles.albumPreview}>
                                            {album.photos && album.photos.length > 0 && (
                                                <ServerImage
                                                    path={album.photos[0].path}
                                                    alt={album.title}
                                                    className={styles.albumCover}
                                                />
                                            )}
                                        </div>
                                        <div className={styles.albumInfo}>
                                            <div className={styles.albumTitle}>{album.title}</div>
                                            <div className={styles.albumCount}>{album.photosCount} фото</div>
                                        </div>
                                        <button
                                            className={styles.removeButton}
                                            onClick={() => handlePhotoAlbumRemove(album)}
                                            aria-label="Удалить"
                                        >
                                            <Close fontSize="small" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {editedTracks.length > 0 && (
                        <div className={styles.attachmentSection}>
                            <h6 className={styles.attachmentSectionTitle}>
                                <MusicNote fontSize="small" style={{ marginRight: 5 }} />
                                Музыка ({editedTracks.length})
                            </h6>
                            <div className={styles.tracks}>
                                {editedTracks.map((track, index) => (
                                    <div key={`track-${track.id}-${index}`} className={styles.trackItemWithRemove}>
                                        <UniversalTrackItem
                                            track={track}
                                            variant="post"
                                            isInLibrary={savedTrackIds.includes(track.id)}
                                            onLibraryStatusChange={() => { }}
                                        />
                                        <button
                                            className={styles.removeTrackButton}
                                            onClick={() => handleTrackRemove(track)}
                                            aria-label="Удалить"
                                        >
                                            <Close fontSize="small" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {editedMusicAlbums.length > 0 && (
                        <div className={styles.attachmentSection}>
                            <h6 className={styles.attachmentSectionTitle}>
                                <LibraryMusic fontSize="small" style={{ marginRight: 5 }} />
                                Музыкальные альбомы ({editedMusicAlbums.length})
                            </h6>
                            <div className={styles.albumsList}>
                                {editedMusicAlbums.map((album, index) => (
                                    <div key={`music-album-${album.id}-${index}`} className={styles.albumItem}>
                                        <UniversalMusicAlbumItem
                                            key={`edit-music-album-${album.id}-${index}`}
                                            album={album}
                                            variant="compact"
                                        />
                                        <button
                                            className={styles.removeButton}
                                            onClick={() => handleMusicAlbumRemove(album)}
                                            title="Удалить альбом"
                                        >
                                            <Close fontSize="small" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className={styles.mediaSelector}>
                <h4 className={styles.mediaSelectorTitle}>Медиа вложения</h4>
                <div className={styles.mediaSelectorTabs}>
                    <Button
                        variant="outlined"
                        startIcon={<AddAPhoto />}
                        onClick={() => document.getElementById('photoUploadInput')?.click()}
                        size="small"
                    >
                        Фото
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<MusicNote />}
                        onClick={() => setShowTrackSelector(true)}
                        size="small"
                    >
                        Музыка
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<AlbumIcon />}
                        onClick={() => setShowPhotoAlbumSelector(true)}
                        size="small"
                    >
                        Фотоальбомы
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<LibraryMusic />}
                        onClick={() => setShowMusicAlbumSelector(true)}
                        size="small"
                    >
                        Музыкальные альбомы
                    </Button>
                </div>

                <div className={styles.editPhotos}>
                    <ImageUploader
                        onImageUploaded={handleImageUploaded}
                        onError={(error) => setError(error)}
                    />

                    <button
                        className={styles.selectExistingButton}
                        onClick={() => setShowPhotoSelector(true)}
                    >
                        Выбрать из загруженных
                    </button>
                </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <div className={styles.editButtons}>
                <button
                    className={styles.cancelButton}
                    onClick={onCancel}
                    disabled={isSubmitting}
                >
                    Отмена
                </button>
                <button
                    className={styles.saveButton}
                    onClick={handleSave}
                    disabled={isSubmitting || (!editedContent.trim() && editedPhotos.length === 0 && editedTracks.length === 0)}
                >
                    {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                </button>
            </div>

            {/* Модальные окна выбора */}
            {showPhotoSelector && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Выберите фотографии</h3>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowPhotoSelector(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <PhotoSelector
                                userId={userId}
                                onSelect={(photos, albums) => {
                                    handlePhotoSelection(photos);
                                }}
                                onCancel={() => setShowPhotoSelector(false)}
                                multiple={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showTrackSelector && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Выберите треки</h3>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowTrackSelector(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <TrackSelector
                                userId={userId}
                                onSelect={handleTracksSelected}
                                onCancel={() => setShowTrackSelector(false)}
                                multiple={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showPhotoAlbumSelector && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Выберите фотоальбомы</h3>
                            <button
                                className={styles.modalClose}
                                onClick={() => setShowPhotoAlbumSelector(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <PhotoSelector
                                userId={userId}
                                onSelect={(photos, albums) => {
                                    handlePhotoAlbumsSelected(albums);
                                }}
                                onCancel={() => setShowPhotoAlbumSelector(false)}
                                multiple={true}
                            />
                        </div>
                    </div>
                </div>
            )}

            {showMusicAlbumSelector && (
                <MusicAlbumSelector
                    isOpen={showMusicAlbumSelector}
                    onClose={() => setShowMusicAlbumSelector(false)}
                    onAlbumsSelected={handleMusicAlbumsSelected}
                    maxAlbums={5}
                    preSelectedAlbums={editedMusicAlbums}
                />
            )}
        </div>
    );
};

export default PostEditor; 