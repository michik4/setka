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
import PostEditor from './PostEditor';

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [liked, setLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(post.likesCount || 0);
    const [isLikeLoading, setIsLikeLoading] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(0);
    const [savedTrackIds, setSavedTrackIds] = useState<number[]>([]);
    const [group, setGroup] = useState<Group | null>(post.group as Group || null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [needsExpansion, setNeedsExpansion] = useState(false);
    const postContentRef = useRef<HTMLDivElement>(null);

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

    // Обработчик сохранения изменений 
    const handleSaveEdit = async (postData: {
        content: string;
        photos: Photo[];
        tracks: Track[];
        albums: Album[];
        musicAlbums: MusicAlbum[];
    }) => {
        if (!user) return;

        setIsSubmitting(true);
        setError(null);

        try {
            const endpoint = post.wallOwnerId ? `/wall/${post.id}` : `/posts/${post.id}`;

            // Получаем массивы ID для вложений
            const photoIds = postData.photos.map(photo => photo.id);
            const trackIds = postData.tracks.map(track => track.id);
            const photoAlbumIds = postData.albums.map(album => album.id);
            const musicAlbumIds = postData.musicAlbums.map(album => album.id);

            console.log('[Post] Редактирование поста', {
                postId: post.id,
                content: postData.content,
                photoIds,
                trackIds,
                photoAlbumIds,
                musicAlbumIds
            });

            // Обновляем пост с новым контентом и вложениями
            const response = await api.put(endpoint, {
                content: postData.content,
                photoIds,
                trackIds,
                photoAlbumIds,
                musicAlbumIds
            });

            console.log('[Post] Ответ сервера после редактирования:', response);

            // Выходим из режима редактирования
            setIsEditing(false);

            // Обновляем пост локально с измененными данными
            const updatedPost = {
                ...post,
                content: postData.content,
                photos: postData.photos,
                tracks: postData.tracks,
                albums: postData.albums,
                musicAlbums: postData.musicAlbums
            };

            // Вызываем колбэк обновления
            onUpdate?.(updatedPost);

            // Обновляем локальное состояние
            post.content = postData.content;
            post.photos = postData.photos;
            post.tracks = postData.tracks;
            post.albums = postData.albums;
            post.musicAlbums = postData.musicAlbums;
        } catch (err) {
            console.error('Ошибка при редактировании поста:', err);
            setError('Не удалось отредактировать пост');
            throw err; // Пробрасываем ошибку наверх для обработки в PostEditor
        } finally {
            setIsSubmitting(false);
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
    }, [post?.tracks]);

    // Проверяем, нужна ли кнопка "Показать больше"
    useEffect(() => {
        const checkHeight = () => {
            if (postContentRef.current) {
                const contentHeight = postContentRef.current.scrollHeight;
                setNeedsExpansion(contentHeight > 600); // 600px - максимальная высота в свернутом состоянии
            }
        };

        // Проверяем после загрузки контента
        checkHeight();

        // Устанавливаем обработчик события resize окна
        window.addEventListener('resize', checkHeight);
        
        // Убираем обработчик при размонтировании компонента
        return () => {
            window.removeEventListener('resize', checkHeight);
        };
    }, [post.content, post.photos, post.tracks, post.albums, post.musicAlbums]);

    const expandPost = () => {
        setIsExpanded(true);
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
                <PostEditor 
                    post={{
                        id: post.id,
                        content: post.content || '',
                        photos: post.photos || [],
                        tracks: post.tracks || [],
                        albums: post.albums || [],
                        musicAlbums: post.musicAlbums || [],
                        author: post.author,
                        createdAt: post.createdAt,
                        wallOwnerId: post.wallOwnerId
                    }}
                    savedTrackIds={savedTrackIds}
                    onCancel={() => setIsEditing(false)}
                    onSave={handleSaveEdit}
                    userId={user?.id || 0}
                />
            ) : (
                <div 
                    className={`${styles.postContent} ${needsExpansion && !isExpanded ? styles.postCollapsed : isExpanded ? styles.postExpanded : ''}`} 
                    ref={postContentRef}
                >
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

                    {needsExpansion && !isExpanded && (
                        <button className={styles.showMoreButton} onClick={expandPost}>
                            Смотреть дальше
                        </button>
                    )}
                </div>
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
        </div>
    );
};