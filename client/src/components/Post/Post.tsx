import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Post as PostType } from '../../types/post.types';
import { Photo } from '../../types/post.types';
import { Track } from '../../types/music.types';
import { Album } from '../../types/album.types';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import { AlbumGrid } from '../AlbumGrid/AlbumGrid';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { ImageSelector } from '../ImageSelector/ImageSelector';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../utils/api';
import styles from './Post.module.css';
import { ServerImage } from '../ServerImage/ServerImage';
import { PhotoViewer } from '../PhotoViewer/PhotoViewer';
import { usePlayer } from '../../contexts/PlayerContext';

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
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Импортируем контекст плеера
    const { playTrack, currentTrack: playerCurrentTrack, isPlaying: playerIsPlaying, togglePlay, tracks: playerTracks, addToQueue } = usePlayer();

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
            
            // Обновляем пост с новым контентом, фотографиями и треками
            const response = await api.put(endpoint, { 
                content: editedContent.trim(),
                photoIds: editedPhotos.map(photo => photo.id),
                trackIds: editedTracks.map(track => track.id)
            });
            
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
        // В режиме редактирования удаляем трек из локального состояния
        setEditedTracks(prev => prev.filter(t => t.id !== track.id));
        setError(null);
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

    const togglePlayTrack = (track: Track) => {
        console.log('Попытка воспроизведения трека из поста:', track);
        console.log('Аудио URL:', track.audioUrl);
        
        if (!track.audioUrl) {
            console.error('ОШИБКА: У трека отсутствует URL для воспроизведения!');
            return;
        }
        
        // Добавляем метаданные о посте к треку
        const trackWithSource = {
            ...track,
            source: {
                type: 'post',
                postId: post.id,
                authorId: post.authorId,
                authorName: `${post.author.firstName} ${post.author.lastName}`
            }
        };

        const isPlayerWindowActive = checkPlayerWindowState();
        const isCurrentWindowPlayerWindow = window.location.pathname.includes('/player');

        // Принудительно заглушаем звук во всех окнах, кроме окна плеера
        if (isPlayerWindowActive && !isCurrentWindowPlayerWindow) {
            // Глобальное отключение звука
            const allAudioElements = document.querySelectorAll('audio');
            allAudioElements.forEach(audioElement => {
                audioElement.muted = true;
                if (!audioElement.paused) {
                    audioElement.pause();
                }
            });
        }

        // Если окно плеера открыто и мы не в окне плеера
        if (isPlayerWindowActive && !isCurrentWindowPlayerWindow) {
            console.log('[Post] Окно плеера открыто, проверяем наличие трека в очереди');
            
            // Проверяем, есть ли трек уже в плейлисте
            const existingTrackIndex = playerTracks.findIndex(t => t.id === track.id);
            
            if (existingTrackIndex !== -1) {
                console.log('[Post] Трек уже в очереди, отправляем команду на переключение');
                // Используем только синхронизационные сообщения, но сами не воспроизводим звук
                
                // Отправляем команду на воспроизведение в окно плеера
                localStorage.setItem('play_track_command', JSON.stringify({
                    trackId: track.id,
                    timestamp: Date.now()
                }));

                // Обновляем локальное состояние
                setIsPlaying(true);
                setCurrentTrack(track);
            } else {
                console.log('[Post] Трек не в очереди, добавляем и отправляем команду на воспроизведение');
                addToQueue(trackWithSource);
                
                // После добавления в очередь отправляем команду на воспроизведение
                setTimeout(() => {
                    localStorage.setItem('play_track_command', JSON.stringify({
                        trackId: track.id,
                        timestamp: Date.now()
                    }));
                }, 200); // Увеличиваем задержку, чтобы трек успел добавиться в очередь
            }
            
            return;
        }
        
        // Если мы в окне плеера или отдельное окно не открыто
        if (isCurrentWindowPlayerWindow || !isPlayerWindowActive) {
            if (playerCurrentTrack?.id === track.id) {
                togglePlay();
            } else {
                playTrack(trackWithSource);
            }
            setCurrentTrack(track);
        }
    };

    // Логгирование треков для отладки
    useEffect(() => {
        if (post.tracks && post.tracks.length > 0) {
            console.log('Треки поста для отображения:', JSON.stringify(post.tracks, null, 2));
            console.log('Присутствует ли audioUrl у треков:', post.tracks.every(track => Boolean(track.audioUrl)));
            if (!post.tracks.every(track => Boolean(track.audioUrl))) {
                console.error('ВНИМАНИЕ: У некоторых треков отсутствует audioUrl!');
                for (const track of post.tracks) {
                    if (!track.audioUrl) {
                        console.error('Трек без audioUrl:', track);
                    }
                }
            }
        }
    }, [post.tracks]);

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
                            onPhotoDelete={handleEditPhotoRemove}
                            canDelete={true}
                            isEditing={true}
                        />
                        {user && (
                            <ImageSelector 
                                userId={user.id}
                                selectedImages={editedPhotos}
                                onImagesChange={setEditedPhotos}
                            />
                        )}
                    </div>

                    {/* Отображение и редактирование треков */}
                    {editedTracks && editedTracks.length > 0 && (
                        <div className={styles.editTracks}>
                            {editedTracks.map(track => (
                                <div key={track.id} className={styles.trackItem}>
                                    <div className={styles.trackCover}>
                                        <img 
                                            src={track.coverUrl} 
                                            alt={track.title} 
                                            className={styles.trackCoverImage}
                                        />
                                    </div>
                                    <div className={styles.trackInfo}>
                                        <div className={styles.trackTitle}>{track.title}</div>
                                        <div className={styles.trackArtist}>{track.artist}</div>
                                        {track.duration && (
                                            <div className={styles.trackDuration}>{track.duration}</div>
                                        )}
                                    </div>
                                    <button
                                        className={styles.trackDeleteBtn}
                                        onClick={() => handleTrackRemove(track)}
                                        title="Удалить трек"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <div className={styles.error}>{error}</div>}

                    <div className={styles.editButtons}>
                        <div className={styles.editButtonsLeft}>
                            <button 
                                className={`${styles.actionButton} ${styles.cancelButton}`}
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
                            {canDelete && (
                                <button 
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={handleDelete}
                                    disabled={isSubmitting}
                                >
                                    Удалить пост
                                </button>
                            )}
                        </div>
                        <div className={styles.editButtonsRight}>
                            <button 
                                className={`${styles.actionButton} ${styles.saveButton}`}
                                onClick={handleEdit}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    <div className={styles.content}>{post.content}</div>
                    {post.photos && post.photos.length > 0 && (
                        <PhotoGrid 
                            photos={post.photos} 
                            onPhotoDelete={handlePhotoDelete}
                            canDelete={Boolean(canDelete)}
                            isEditing={isEditing}
                            isWallPost={Boolean(post.wallOwnerId)}
                            onPhotoClick={handlePhotoClick}
                        />
                    )}
                    
                    {/* Отображение альбомов в посте */}
                    {post.albums && post.albums.length > 0 && (
                        <div className={styles.albums}>
                            {post.albums.map(album => (
                                <AlbumGrid
                                    key={album.id}
                                    album={album}
                                />
                            ))}
                        </div>
                    )}

                    {/* Отображение треков в посте */}
                    {post.tracks && post.tracks.length > 0 && (
                        <div className={styles.tracks} style={{ display: 'flex', flexDirection: 'column' }}>
                            {post.tracks.map(track => (
                                <div 
                                    key={track.id} 
                                    className={`${styles.trackItem} ${playerCurrentTrack?.id === track.id && playerIsPlaying ? styles.playing : ''}`}
                                    style={{ display: 'flex', width: '100%' }}
                                >
                                    <div className={styles.trackCover}>
                                        <img 
                                            src={track.coverUrl} 
                                            alt={track.title} 
                                            className={styles.trackCoverImage}
                                        />
                                        <button 
                                            className={styles.playButton}
                                            onClick={() => togglePlayTrack(track)}
                                            title={checkPlayerWindowState() ? "Добавить в плеер" : "Воспроизвести"}
                                        >
                                            {checkPlayerWindowState() ? (
                                                <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                                    <path d="M14 12l-8.5 6V6L14 12zm3-1.5v3l4.5-1.5L17 10.5z"/>
                                                </svg>
                                            ) : (
                                                playerCurrentTrack?.id === track.id && playerIsPlaying ? (
                                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                                    </svg>
                                                ) : (
                                                    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
                                                        <path d="M8 5v14l11-7z"/>
                                                    </svg>
                                                )
                                            )}
                                        </button>
                                    </div>
                                    <div className={styles.trackInfo}>
                                        <div className={styles.trackTitle}>{track.title}</div>
                                        <div className={styles.trackArtist}>{track.artist}</div>
                                        <div className={styles.trackDuration}>
                                            {track.duration}
                                            {track.playCount > 0 && (
                                                <span className={styles.playCount}>
                                                    • {track.playCount} {getProperWordForm(track.playCount, ['прослушивание', 'прослушивания', 'прослушиваний'])}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {selectedPhoto && (
                        <PhotoViewer
                            photo={selectedPhoto}
                            onClose={() => {
                                setSelectedPhoto(null);
                                setSelectedPhotoIndex(null);
                            }}
                            onDelete={canDelete ? () => handlePhotoDelete(selectedPhoto) : undefined}
                            canDelete={canDelete}
                            isWallPost={Boolean(post.wallOwnerId)}
                            allPhotos={post.photos}
                            currentIndex={selectedPhotoIndex || 0}
                            onPhotoChange={handlePhotoChange}
                        />
                    )}

                    <div className={styles.footer}>
                        <button 
                            className={`${styles.actionButton} ${styles.likeButton} ${liked ? styles.liked : ''}`}
                            onClick={handleLike}
                            disabled={isLikeLoading}
                        >
                            {isLikeLoading ? '...' : liked ? 'Нравится' : 'Нравится'} • {likesCount}
                        </button>
                        
                        <div className={styles.actions}>
                            <button className={styles.actionButton}>
                                💬 {post.commentsCount || 0}
                            </button>
                            <button className={styles.actionButton}>
                                🔄 {post.sharesCount || 0}
                            </button>
                        </div>

                        <div className={styles.modifyButtons}>
                            {canEdit && !isEditing && (
                                <button
                                    className={`${styles.actionButton} ${styles.editButton}`}
                                    onClick={() => setIsEditing(true)}
                                >
                                    Редактировать
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}

            {error && <div className={styles.error}>{error}</div>}
        </div>
    );
};