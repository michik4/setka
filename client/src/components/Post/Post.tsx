import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Post as PostType } from '../../types/post.types';
import { Photo } from '../../types/post.types';
import { Track } from '../../types/music.types';
import { Album } from '../../types/album.types';
import { MusicAlbum } from '../../types/music.types';
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
import { TrackSelector } from '../TrackSelector';
import MusicAlbumSelector from '../MusicAlbumSelector/MusicAlbumSelector';
import { AddAPhoto, AttachFile, Close, MusicNote, Album as AlbumIcon, LibraryMusic } from '@mui/icons-material';
import UniversalMusicAlbumItem from '../UniversalAlbumItem/UniversalAlbumItem';
import { Button } from '@mui/material';
import { MusicService } from '../../services/music.service';
import { Spinner } from '../Spinner/Spinner';

// Получаем URL API из переменных окружения
const API_URL = process.env.REACT_APP_API_URL || '/api';

const ICON_SIZE = 18;
const SUBTITLE_ICON_SIZE = 16;

interface PostProps {
    post: PostType;
    onDelete?: () => void;
    onUpdate?: (updatedPost: PostType) => void;
}

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

            {/* Неинтерактивная нижняя панель с лайками и комментариями */}
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

export const Post: React.FC<PostProps> = ({ post, onDelete, onUpdate }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content || '');
    const [editedPhotos, setEditedPhotos] = useState<Photo[]>(post.photos || []);
    const [editedTracks, setEditedTracks] = useState<Track[]>(post.tracks || []);
    const [editedPhotoAlbums, setEditedPhotoAlbums] = useState<Album[]>(post.albums || []);
    const [editedMusicAlbums, setEditedMusicAlbums] = useState<MusicAlbum[]>(post.musicAlbums || []);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likesCount || 0);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
    const [showPhotoSelector, setShowPhotoSelector] = useState(false);
    const [showTrackSelector, setShowTrackSelector] = useState(false);
    const [showPhotoAlbumSelector, setShowPhotoAlbumSelector] = useState(false);
    const [showMusicAlbumSelector, setShowMusicAlbumSelector] = useState(false);
    const [savedTrackIds, setSavedTrackIds] = useState<number[]>([]);
    const [group, setGroup] = useState<Group | null>(post.group as Group || null);

    // Импортируем контекст плеера
    const { playTrack, currentTrack: playerCurrentTrack, isPlaying: playerIsPlaying, togglePlay, tracks: playerTracks, addToQueue } = usePlayer();

    // Проверяем, какие треки уже добавлены в библиотеку пользователя
    useEffect(() => {
        const postTracks = post?.tracks || [];
        if (postTracks.length > 0 && user) {
            const checkSavedTracks = async () => {
                try {
                    const savedIds: number[] = [];
                    
                    // Проверяем статус каждого трека из поста с помощью метода isTrackInLibrary
                    for (const track of postTracks) {
                        const isInLibrary = await MusicService.isTrackInLibrary(track.id);
                        if (isInLibrary) {
                            savedIds.push(track.id);
                        }
                    }
                    
                    if (savedIds.length > 0) {
                        console.log('[Post] Найдены треки в библиотеке:', savedIds);
                        setSavedTrackIds(savedIds);
                    }
                } catch (error) {
                    console.error('[Post] Ошибка при проверке треков в библиотеке:', error);
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
            if (!editedContent.trim() && editedPhotos.length === 0 && editedTracks.length === 0 &&
                editedPhotoAlbums.length === 0 && editedMusicAlbums.length === 0) {
                setError('Добавьте текст или выберите медиа');
                setIsSubmitting(false);
                return;
            }

            // Фильтруем только не удаленные фотографии для передачи их ID
            const activePhotos = editedPhotos.filter(photo => !photo.isDeleted);

            // Получаем массивы ID для вложений
            const photoIds = activePhotos.map(photo => photo.id);
            const trackIds = editedTracks.map(track => track.id);
            const photoAlbumIds = editedPhotoAlbums.map(album => album.id);
            const musicAlbumIds = editedMusicAlbums.map(album => album.id);

            console.log('[Post] Редактирование поста', {
                postId: post.id,
                content: editedContent.trim(),
                photoIds: photoIds,
                trackIds: trackIds,
                photoAlbumIds: photoAlbumIds,
                musicAlbumIds: musicAlbumIds
            });

            // Обновляем пост с новым контентом и вложениями
            const response = await api.put(endpoint, {
                content: editedContent.trim(),
                photoIds: photoIds,
                trackIds: trackIds,
                photoAlbumIds: photoAlbumIds,
                musicAlbumIds: musicAlbumIds
            });

            console.log('[Post] Ответ сервера после редактирования:', response);

            // Выходим из режима редактирования
            setIsEditing(false);

            // Обновляем пост локально с измененными данными
            const updatedPost = {
                ...post,
                content: editedContent.trim(),
                photos: activePhotos,
                tracks: editedTracks,
                albums: editedPhotoAlbums,
                musicAlbums: editedMusicAlbums
            };

            // Вызываем колбэк обновления
            onUpdate?.(updatedPost);

            // Обновляем локальное состояние
            post.content = editedContent.trim();
            post.photos = activePhotos;
            post.tracks = editedTracks;
            post.albums = editedPhotoAlbums;
            post.musicAlbums = editedMusicAlbums;
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
        if (!user) return null;

        try {
            // Получаем все альбомы пользователя
            const response = await api.get(`/users/${user.id}/albums`);
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
                    userId: user.id
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

    // Добавляем обработчик для выбора треков
    const handleTracksSelected = (tracks: Track[]) => {
        // Проверяем, не превышает ли общее количество треков максимально допустимое (10)
        const currentTrackCount = editedTracks.length;
        const totalTracks = currentTrackCount + tracks.length;

        if (totalTracks > 10) {
            setError(`Максимальное количество треков в посте: 10. Выбрано: ${totalTracks}`);
            // Добавляем только часть треков до лимита
            const availableSlots = 10 - currentTrackCount;
            if (availableSlots > 0) {
                setEditedTracks(prev => [...prev, ...tracks.slice(0, availableSlots)]);
            }
        } else {
            // Добавляем все выбранные треки
            setEditedTracks(prev => [...prev, ...tracks]);
            setError(null);
        }

        setShowTrackSelector(false);
    };

    // Функция для обработки выбора фотоальбомов
    const handlePhotoAlbumsSelected = (albums: Album[]) => {
        // Проверяем, не превышает ли общее кол-во альбомов максимально допустимое (5)
        const currentAlbumCount = editedPhotoAlbums.length;
        if (currentAlbumCount + albums.length > 5) {
            setError(`Максимальное количество фотоальбомов в посте: 5. Выбрано: ${currentAlbumCount + albums.length}`);
            // Добавляем только часть альбомов до лимита
            const availableSlots = 5 - currentAlbumCount;
            if (availableSlots > 0) {
                setEditedPhotoAlbums(prev => [...prev, ...albums.slice(0, availableSlots)]);
            }
        } else {
            // Добавляем все выбранные альбомы
            setEditedPhotoAlbums(prev => [...prev, ...albums]);
            setError(null);
        }

        setShowPhotoAlbumSelector(false);
    };

    // Функция для обработки выбора музыкальных альбомов
    const handleMusicAlbumsSelected = (albums: MusicAlbum[]) => {
        // Проверяем, не превышает ли кол-во альбомов максимально допустимое (5)
        if (albums.length > 5) {
            setError(`Максимальное количество музыкальных альбомов в посте: 5. Выбрано: ${albums.length}`);
            // Добавляем только первые 5 альбомов
            setEditedMusicAlbums(albums.slice(0, 5));
        } else {
            // Заменяем текущие альбомы новыми выбранными
            setEditedMusicAlbums(albums);
            setError(null);
        }

        setShowMusicAlbumSelector(false);
    };

    // Функция для удаления фотоальбома из списка выбранных
    const handlePhotoAlbumRemove = (album: Album) => {
        setEditedPhotoAlbums(prev => prev.filter(a => a.id !== album.id));
    };

    // Функция для удаления музыкального альбома из списка выбранных
    const handleMusicAlbumRemove = (album: MusicAlbum) => {
        setEditedMusicAlbums(prev => prev.filter(a => a.id !== album.id));
    };

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
                            onClick={() => {
                                setIsEditing(false);
                                setEditedContent(post.content || '');
                                setEditedPhotos(post.photos || []);
                                setEditedTracks(post.tracks || []);
                                setEditedPhotoAlbums(post.albums || []);
                                setEditedMusicAlbums(post.musicAlbums || []);
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

                    {post.musicAlbums && post.musicAlbums.length > 0 && (
                        <div className={styles.musicAlbumsPreview}>
                            <div className={styles.musicAlbumGrid}>
                                {Array.isArray(post.musicAlbums) && post.musicAlbums.map((album, index) => (
                                    <UniversalMusicAlbumItem
                                        key={`view-album-${album.id}-${index}`}
                                        album={album}
                                        variant="post"
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
            {!isEditing && (
                <>
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
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
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



                    <div id={`comments-${post.id}`}>
                        <Comments postId={post.id} />
                    </div>
                </>
            )}
            {selectedPhoto && (
                <PhotoViewer
                    photo={selectedPhoto}
                    onClose={() => {
                        setSelectedPhoto(null);
                        setSelectedPhotoIndex(0);
                    }}
                    allPhotos={post.photos.filter(photo => !photo.isDeleted)}
                    currentIndex={selectedPhotoIndex}
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

            {/* Добавляем селектор треков в конец файла перед закрывающим тегом </div> последнего блока */}
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
                                userId={user?.id || 0}
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
                                userId={user?.id || 0}
                                onSelect={(photos, albums) => {
                                    setEditedPhotoAlbums(prev => [...prev, ...albums]);
                                    setShowPhotoAlbumSelector(false);
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