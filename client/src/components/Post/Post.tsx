import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Post as PostType } from '../../types/post.types';
import { Photo } from '../../types/post.types';
import { Track } from '../../types/music.types';
import { Album } from '../../types/album.types';
import { Group } from '../../types/group.types';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import { AlbumGrid } from '../AlbumGrid/AlbumGrid';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { PhotoSelector } from '../PhotoSelector/PhotoSelector';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import styles from './Post.module.css';
import { ServerImage } from '../ServerImage/ServerImage';
import { PhotoViewer } from '../PhotoViewer/PhotoViewer';
import { usePlayer } from '../../contexts/PlayerContext';
import { useQueue } from '../../contexts/QueueContext';
import { Comments } from '../Comments/Comments';
import UniversalTrackItem from '../UniversalTrackItem/UniversalTrackItem';

// Получаем URL API из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || '/api';

interface PostProps {
    post: PostType;
    onDelete?: () => void;
    onUpdate?: (updatedPost: PostType) => void;
}

export const Post: React.FC<PostProps> = ({ post, onDelete, onUpdate }) => {
    const { user } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [editedPhotos, setEditedPhotos] = useState<Photo[]>(post.photos || []);
    const [editedTracks, setEditedTracks] = useState<Track[]>(post.tracks || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likesCount);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [savingTrackId, setSavingTrackId] = useState<number | null>(null);
    const [savedTrackIds, setSavedTrackIds] = useState<number[]>([]);
    const [group, setGroup] = useState<Group | null>(null);
    const [showPhotoSelector, setShowPhotoSelector] = useState(false);
    
    // Импортируем контекст плеера
    const { playTrack, currentTrack: playerCurrentTrack, isPlaying: playerIsPlaying, togglePlay, tracks: playerTracks, addToQueue } = usePlayer();

    // Проверяем, какие треки уже добавлены в библиотеку пользователя
    useEffect(() => {
        const postTracks = post?.tracks || [];
        if (postTracks.length > 0 && user) {
            const checkSavedTracks = async () => {
                try {
                    // Получаем все треки пользователя
                    const response = await api.get('/music');
                    if (response && response.tracks) {
                        // Создаем карту "название+исполнитель" -> true для быстрой проверки
                        const userTracksMap = new Map<string, boolean>();
                        response.tracks.forEach((track: Track) => {
                            const key = `${track.title}:${track.artist}`.toLowerCase();
                            userTracksMap.set(key, true);
                        });
                        
                        // Проверяем, какие треки из поста уже есть в библиотеке пользователя
                        const savedIds = postTracks
                            .filter(track => {
                                const key = `${track.title}:${track.artist}`.toLowerCase();
                                return userTracksMap.has(key);
                            })
                            .map(track => track.id);
                        
                        if (savedIds.length > 0) {
                            console.log('[Post] Найдены уже добавленные треки:', savedIds);
                            setSavedTrackIds(savedIds);
                        }
                    }
                } catch (error) {
                    console.error('[Post] Ошибка при проверке сохраненных треков:', error);
                }
            };
            
            checkSavedTracks();
        }
    }, [post?.tracks, user]);

    useEffect(() => {
        // Проверяем, лайкнул ли пользователь этот пост
        const checkLike = async () => {
            try {
                const endpoint = post.wallOwnerId ? `/wall/${post.id}/like` : `/posts/${post.id}/like`;
                console.log('[Post] Проверка лайка:', endpoint);
                const response = await api.get(endpoint);
                console.log('[Post] Результат проверки лайка:', response);
                
                if (response && typeof response.liked === 'boolean') {
                    setLiked(response.liked);
                    if (typeof response.likesCount === 'number') {
                        setLikesCount(response.likesCount);
                    }
                }
            } catch (error) {
                console.error('Ошибка при проверке лайка:', error);
            }
        };

        checkLike();
    }, [post.id, post.wallOwnerId]);

    const handleLike = async () => {
        if (isLikeLoading) return;

        setIsLikeLoading(true);
        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}/like` : `/posts/${post.id}/like`;
            console.log('[Post] Отправка запроса на лайк:', endpoint);
            
            const response = await api.post(endpoint, {});
            console.log('[Post] Получен ответ от сервера:', response);
            
            if (!response) {
                throw new Error('Нет ответа от сервера');
            }
            
            if (typeof response.liked === 'boolean' && typeof response.likesCount === 'number') {
                setLiked(response.liked);
                setLikesCount(response.likesCount);
            } else {
                console.error('Некорректный формат ответа:', response);
                throw new Error('Некорректный формат ответа от сервера');
            }
        } catch (error) {
            console.error('Ошибка при обработке лайка:', error);
            setError('Не удалось обработать лайк. Попробуйте позже.');
        } finally {
            setIsLikeLoading(false);
        }
    };

    // Автор может редактировать свой пост
    const canEdit = user && user.id === post.authorId;
    // Автор и владелец стены могут удалять посты
    const canDelete = Boolean(user && (user.id === post.authorId || (post.wallOwnerId && user.id === post.wallOwnerId)));

    const handleDelete = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) {
            return;
        }

        try {
            setIsSubmitting(true);
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;
            
            // Сначала удаляем пост
            await api.delete(endpoint);
            
            // Затем удаляем все фотографии поста
            for (const photo of post.photos) {
                await api.delete(`/photos/${photo.id}`);
            }
            
            // Закрываем режим редактирования и вызываем колбэк
            setIsEditing(false);
            onDelete?.();
        } catch (err) {
            console.error('Ошибка при удалении поста:', err);
            setError('Не удалось удалить пост');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async () => {
        if (!user) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;
            
            // Проверяем наличие контента или вложений
            if (!editedContent.trim() && editedPhotos.length === 0 && editedTracks.length === 0) {
                setError('Добавьте текст или выберите медиа');
                setIsSubmitting(false);
                return;
            }
            
            console.log('[Post] Редактирование поста', {
                postId: post.id,
                content: editedContent.trim(),
                photoIds: editedPhotos.map(photo => photo.id),
                trackIds: editedTracks.map(track => track.id)
            });
            
            // Преобразуем массивы ID в JSON-строки для отправки
            const photoIdsJson = JSON.stringify(editedPhotos.map(photo => photo.id));
            const trackIdsJson = JSON.stringify(editedTracks.map(track => track.id));
            
            // Обновляем пост с новым контентом и вложениями
            const response = await api.put(endpoint, { 
                content: editedContent.trim(),
                photoIds: photoIdsJson,
                trackIds: trackIdsJson
            });
            
            console.log('[Post] Ответ сервера после редактирования:', response);
            
            // Выходим из режима редактирования
            setIsEditing(false);
            
            // Обновляем пост локально с измененными данными
            const updatedPost = {
                ...post,
                content: editedContent.trim(),
                photos: editedPhotos,
                tracks: editedTracks
            };
            
            // Вызываем колбэк обновления
            onUpdate?.(updatedPost);
            
            // Обновляем локальное состояние
            post.content = editedContent.trim();
            post.photos = editedPhotos;
            post.tracks = editedTracks;
        } catch (err) {
            console.error('Ошибка при редактировании поста:', err);
            setError('Не удалось отредактировать пост');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePhotoDelete = async (photo: Photo) => {
        if (!window.confirm('Вы уверены, что хотите удалить эту фотографию?')) {
            return;
        }

        try {
            // Удаляем фотографию
            await api.delete(`/photos/${photo.id}`);

            // Обновляем локальное состояние
            const updatedPhoto = { ...photo, isDeleted: true };
            
            // Обновляем editedPhotos, сохраняя удаленную фотографию
            setEditedPhotos(prev => prev.map(p => 
                p.id === photo.id ? updatedPhoto : p
            ));
            
            // Обновляем фотографии в посте, сохраняя удаленную фотографию
            post.photos = post.photos.map(p => 
                p.id === photo.id ? updatedPhoto : p
            );
            onUpdate?.(post);
        } catch (err) {
            console.error('Ошибка при удалении фотографии:', err);
            setError('Не удалось удалить фотографию');
        }
    };

    const handleEditPhotoRemove = (photo: Photo) => {
        // В режиме редактирования просто удаляем фотографию из локального состояния
        setEditedPhotos(prev => prev.filter(p => p.id !== photo.id));
        setError(null);
    };

    const handleImageUploaded = (photo: Photo) => {
        // Проверяем, не превышает ли общее количество фотографий максимально допустимое (20)
        if (editedPhotos.length >= 20) {
            setError('Достигнуто максимальное количество фотографий (20)');
            return;
        }
        
        // Добавляем новую фотографию к списку
        setEditedPhotos(prev => [...prev, photo]);
        setError(null);
    };

    const handlePhotoClick = (photo: Photo, index: number) => {
        setSelectedPhoto(photo);
        setSelectedPhotoIndex(index);
    };

    const handlePhotoChange = (photo: Photo) => {
        setSelectedPhoto(photo);
        const index = post.photos.findIndex(p => p.id === photo.id);
        setSelectedPhotoIndex(index);
    };

    const handleTrackRemove = (track: Track) => {
        // Удаляем трек из редактируемого списка
        setEditedTracks(prev => prev.filter(t => t.id !== track.id));
    };

    // Добавляем функцию проверки состояния окна плеера
    const checkPlayerWindowState = () => {
        const playerWindowOpened = localStorage.getItem('player_window_opened');
        const playerWindowClosed = localStorage.getItem('player_window_closed');
        let isPlayerWindowActive = false;
        
        if (playerWindowOpened && playerWindowClosed) {
            const openedTime = parseInt(playerWindowOpened);
            const closedTime = parseInt(playerWindowClosed);
            isPlayerWindowActive = openedTime > closedTime;
        } else if (playerWindowOpened && !playerWindowClosed) {
            isPlayerWindowActive = true;
        }
        
        return isPlayerWindowActive;
    };

    // Логгирование треков для отладки
    useEffect(() => {
        const postTracks = post?.tracks || [];
        if (postTracks.length > 0) {
            console.log('Треки поста для отображения:', JSON.stringify(postTracks, null, 2));
            
            // Проверяем и обновляем audioUrl у треков при необходимости
            const updatedTracks = postTracks.map(track => {
                // Если у трека нет audioUrl, но есть filename, формируем URL
                if (!track.audioUrl && track.filename) {
                    return {
                        ...track,
                        audioUrl: `/api/music/file/${track.filename}`
                    };
                }
                return track;
            });
            
            // Если были обновления в треках, обновляем state
            if (JSON.stringify(updatedTracks) !== JSON.stringify(postTracks)) {
                console.log('Обновлены URL для треков:', updatedTracks);
                // Если трек в editedTracks, обновляем его там
                if (isEditing) {
                    setEditedTracks(updatedTracks);
                }
            }
            
            console.log('Присутствует ли audioUrl у треков:', updatedTracks.every(track => Boolean(track.audioUrl)));
            if (!updatedTracks.every(track => Boolean(track.audioUrl))) {
                console.error('ВНИМАНИЕ: У некоторых треков отсутствует audioUrl!');
                for (const track of updatedTracks) {
                    if (!track.audioUrl) {
                        console.error('Трек без audioUrl:', track);
                    }
                }
            }
        }
    }, [post?.tracks, isEditing]);

    // Функция для правильного склонения слов в зависимости от числа
    const getProperWordForm = (count: number, forms: [string, string, string]): string => {
        const remainder100 = Math.abs(count) % 100;
        const remainder10 = remainder100 % 10;
        
        if (remainder100 > 10 && remainder100 < 20) {
            return forms[2];
        }
        
        if (remainder10 > 1 && remainder10 < 5) {
            return forms[1];
        }
        
        if (remainder10 === 1) {
            return forms[0];
        }
        
        return forms[2];
    };

    // Добавляем обработчик для выбора фотографий из галереи
    const handlePhotoSelection = (photos: Photo[]) => {
        // Добавляем выбранные фотографии к уже имеющимся
        const newPhotos = [...editedPhotos];
        
        // Проверяем, не превышает ли общее количество фотографий максимально допустимое (20)
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

    // Загружаем информацию о группе только если её нет в посте
    useEffect(() => {
        const fetchGroupInfo = async () => {
            if (post.groupId && !post.group) {
                try {
                    // Получаем данные о группе с аватаром
                    const response = await api.get(`/groups/${post.groupId}?with_avatar=true`);
                    if (response) {
                        setGroup(response);
                        console.log('[Post] Загружена информация о группе с аватаром:', response);
                    }
                } catch (error) {
                    console.error('[Post] Ошибка при загрузке информации о группе:', error);
                }
            } else if (post.group) {
                // Если группа уже есть в посте, но без аватара, загружаем аватар
                if (!post.group.avatar && post.group.id) {
                    try {
                        const groupWithAvatar = await api.get(`/groups/${post.group.id}?with_avatar=true`);
                        if (groupWithAvatar && groupWithAvatar.avatar) {
                            setGroup({
                                ...post.group,
                                avatar: groupWithAvatar.avatar
                            } as unknown as Group);
                            console.log('[Post] Дозагружен аватар группы:', groupWithAvatar.avatar);
                        } else {
                            setGroup(post.group as unknown as Group);
                        }
                    } catch (avatarError) {
                        console.error('[Post] Ошибка при загрузке аватара группы:', avatarError);
                        setGroup(post.group as unknown as Group);
                    }
                } else {
                    setGroup(post.group as unknown as Group);
                }
            }
        };
        
        fetchGroupInfo();
    }, [post.groupId, post.group]);

    return (
        <div className={styles.post}>
            <div className={styles.postHeader}>
                <div className={styles.authorInfo}>
                    <Link 
                        to={group ? `/groups/${group.id}` : `/users/${post.author.id}`} 
                        className={styles.authorAvatar}
                    >
                        {group && group.avatar ? (
                            <ServerImage 
                                path={group.avatar.path} 
                                alt={group.name} 
                                className={styles.authorAvatar}
                            />
                        ) : post.author.avatar ? (
                            <ServerImage 
                                path={post.author.avatar.path} 
                                alt={`${post.author.firstName} ${post.author.lastName}`} 
                                className={styles.authorAvatar}
                            />
                        ) : (
                            <div className={styles.defaultAvatar}>
                                {group ? group.name.charAt(0).toUpperCase() : 
                                    `${post.author.firstName.charAt(0)}${post.author.lastName.charAt(0)}`}
                            </div>
                        )}
                    </Link>
                    <div className={styles.authorDetails}>
                        <div className={styles.nameAndGroup}>
                            {group ? (
                                <Link 
                                    to={`/groups/${group.id}`} 
                                    className={styles.authorName}
                                >
                                    {group.name}
                                </Link>
                            ) : (
                                <Link 
                                    to={`/users/${post.author.id}`} 
                                    className={styles.authorName}
                                >
                                    {post.author.firstName} {post.author.lastName}
                                </Link>
                            )}
                            
                            {group && (
                                <div className={styles.groupInfo}>
                                    <span className={styles.groupDivider}>•</span>
                                    <Link 
                                        to={`/users/${post.author.id}`} 
                                        className={styles.postAuthor}
                                    >
                                        Автор: {post.author.firstName} {post.author.lastName}
                                    </Link>
                                </div>
                            )}
                        </div>
                        <div className={styles.postTime}>
                            {new Date(post.createdAt).toLocaleString('ru', {
                                day: 'numeric',
                                month: 'short',
                                hour: 'numeric',
                                minute: 'numeric'
                            })}
                        </div>
                    </div>
                </div>
            </div>
            
            {isEditing ? (
                <div className={styles.editContainer}>
                    <textarea
                        className={styles.editTextarea}
                        value={editedContent}
                        onChange={e => setEditedContent(e.target.value)}
                        placeholder="Что у вас нового?"
                    />
                    
                    {/* Предпросмотр поста */}
                    {(editedContent.trim() || editedPhotos.length > 0 || editedTracks.length > 0) && (
                        <div className={styles.previewContainer}>
                            <h4 className={styles.previewTitle}>Предпросмотр</h4>
                            <div className={styles.postPreview}>
                                {editedContent && (
                                    <div className={styles.content}>{editedContent}</div>
                                )}
                                
                                {editedPhotos.length > 0 && (
                                    <PhotoGrid
                                        photos={editedPhotos}
                                        onPhotoClick={handlePhotoClick}
                                        onPhotoDelete={handleEditPhotoRemove}
                                        isEditing={true}
                                        canDelete={true}
                                    />
                                )}
                                
                                {editedTracks.length > 0 && (
                                    <div className={styles.tracks}>
                                        {editedTracks.map((track, index) => (
                                            <div key={`edit-track-${track.id}-${index}`} className={styles.trackItemWithControls}>
                                                <UniversalTrackItem 
                                                    track={track} 
                                                    variant="post" 
                                                    isInLibrary={savedTrackIds.includes(track.id)}
                                                    onLibraryStatusChange={() => {
                                                        if (savedTrackIds.includes(track.id)) {
                                                            setSavedTrackIds(savedTrackIds.filter(id => id !== track.id));
                                                        } else {
                                                            setSavedTrackIds([...savedTrackIds, track.id]);
                                                        }
                                                    }}
                                                />
                                                <button 
                                                    className={styles.trackDeleteBtn}
                                                    onClick={() => handleTrackRemove(track)}
                                                    title="Удалить трек"
                                                >
                                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5-1-1h-5l-1 1H5v2h14V4h-3.5z"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    
                    <div className={styles.mediaSelector}>
                        <h4 className={styles.mediaSelectorTitle}>Медиа вложения</h4>
                        <div className={styles.mediaSelectorTabs}>
                            <button 
                                className={`${styles.mediaSelectorTab} ${styles.active}`}
                                type="button"
                            >
                                Фотографии
                            </button>
                            <button 
                                className={styles.mediaSelectorTab}
                                type="button"
                                disabled
                            >
                                Музыка
                            </button>
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
                            onClick={() => {
                                setIsEditing(false);
                                setEditedContent(post.content);
                                setEditedPhotos(post.photos || []);
                                setEditedTracks(post.tracks || []);
                                setError(null);
                            }}
                            disabled={isSubmitting}
                        >
                            Отмена
                        </button>
                        <button
                            className={styles.saveButton}
                            onClick={handleEdit}
                            disabled={isSubmitting || (!editedContent.trim() && editedPhotos.length === 0 && editedTracks.length === 0)}
                        >
                            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className={styles.content}>{post.content}</div>
                    
                    {post.photos && post.photos.length > 0 && (
                        <PhotoGrid
                            photos={post.photos.filter(photo => !photo.isDeleted)}
                            onPhotoClick={handlePhotoClick}
                        />
                    )}
                    
                    {post.albums && post.albums.length > 0 && (
                        <div className={styles.albums}>
                            <AlbumGrid album={post.albums[0]} />
                        </div>
                    )}
                    
                    {post.tracks && post.tracks.length > 0 && (
                        <div className={styles.tracks}>
                            {post.tracks.map((track, index) => (
                                <UniversalTrackItem 
                                    key={`post-track-${track.id}-${index}`}
                                    track={track} 
                                    variant="post" 
                                    isInLibrary={savedTrackIds.includes(track.id)}
                                    onLibraryStatusChange={() => {
                                        if (savedTrackIds.includes(track.id)) {
                                            setSavedTrackIds(savedTrackIds.filter(id => id !== track.id));
                                        } else {
                                            setSavedTrackIds([...savedTrackIds, track.id]);
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
            
            <div className={styles.footer}>
                <div className={`${styles.actions} postActionsBar`}>
                    <button
                        className={`${styles.actionButton} ${styles.likeButton} ${liked ? styles.liked : ''} postActionItem`}
                        onClick={handleLike}
                        disabled={isLikeLoading}
                        title="Нравится"
                    >
                        {liked ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="#e53935">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        )}
                        {likesCount > 0 && <span className={styles.actionText}>{likesCount}</span>}
                    </button>
                    <button 
                        className={`${styles.actionButton} postActionItem`}
                        title="Комментарии"
                        onClick={() => document.getElementById(`comments-${post.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {post.commentsCount > 0 && <span className={styles.actionText}>{post.commentsCount}</span>}
                    </button>
                </div>
                <div className={styles.postManageActions}>
                    {canEdit && !isEditing && (
                        <button
                            className={`${styles.actionButton}`}
                            onClick={() => setIsEditing(true)}
                            title="Редактировать"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                        </button>
                    )}
                    {canDelete && !isEditing && (
                        <button
                            className={`${styles.actionButton} ${styles.deleteIcon}`}
                            onClick={handleDelete}
                            disabled={isSubmitting}
                            title="Удалить"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
            
            {/* Блок комментариев */}
            <div id={`comments-${post.id}`}>
                <Comments postId={post.id} />
            </div>
            
            {selectedPhoto && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => {
                        setSelectedPhoto(null);
                        setSelectedPhotoIndex(null);
                    }}
                    allPhotos={post.photos.filter(photo => !photo.isDeleted)}
                    currentIndex={selectedPhotoIndex || 0}
                    onPhotoChange={handlePhotoChange}
                />
            )}

            {/* Модальное окно выбора фотографий */}
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
                                userId={user?.id || 0}
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
        </div>
    );
};