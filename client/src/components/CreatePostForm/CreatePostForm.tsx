import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Photo } from '../../types/post.types';
import { Album } from '../../types/album.types';
import { Track, MusicAlbum } from '../../types/music.types';
import { ImageUploader } from '../ImageUploader/ImageUploader';
import { PhotoGrid } from '../PhotoGrid/PhotoGrid';
import UploadAudio from '../UploadAudio';
import { useAuth } from '../../contexts/AuthContext';
import styles from './CreatePostForm.module.css';
import { api } from '../../utils/api';
import { PhotoSelector } from '../PhotoSelector/PhotoSelector';
import { ServerImage } from '../ServerImage/ServerImage';
import { TrackSelector } from '../TrackSelector';
import { groupService } from '../../services/groupService';
import { Group } from '../../types/group.types';
import MusicAlbumSelector from '../MusicAlbumSelector/MusicAlbumSelector';
import UniversalMusicAlbumItem from '../UniversalAlbumItem/UniversalAlbumItem';
import MusicSelector from '../MusicSelector/MusicSelector';
import { AttachFile as AttachFileIcon, Photo as PhotoIcon, MusicNote as MusicNoteIcon, Upload as UploadIcon } from '@mui/icons-material';

interface CreatePostFormProps {
    onSuccess?: () => void;
    wallOwnerId?: number;
    groupId?: number;
}

interface AttachmentBase {
    type: 'photo' | 'album' | 'track' | 'musicAlbum';
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

interface MusicAlbumAttachment extends AttachmentBase {
    type: 'musicAlbum';
    data: MusicAlbum;
}

type Attachment = PhotoAttachment | AlbumAttachment | TrackAttachment | MusicAlbumAttachment;

interface PostAuthor {
    id: number;
    type: 'user' | 'group';
    name: string;
    avatar?: string;
}

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSuccess, wallOwnerId, groupId }) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isFeedPage = location.pathname === '/feed';
    const [content, setContent] = useState('');
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showPhotoSelector, setShowPhotoSelector] = useState(false);
    const [showAudioUploader, setShowAudioUploader] = useState(false);
    const [showTrackSelector, setShowTrackSelector] = useState(false);
    const [showMusicAlbumSelector, setShowMusicAlbumSelector] = useState(false);
    const [showMusicSelector, setShowMusicSelector] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [uploadAlbumId, setUploadAlbumId] = useState<number | null>(null);
    const [adminGroups, setAdminGroups] = useState<Group[]>([]);
    const [selectedAuthor, setSelectedAuthor] = useState<PostAuthor | null>(null);
    const formRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isSelectorOpen, setIsSelectorOpen] = useState(false);
    const selectorRef = useRef<HTMLDivElement>(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const attachMenuRef = useRef<HTMLDivElement>(null);

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

    // Загрузка групп и установка начального автора
    useEffect(() => {
        const loadAdminGroupsAndSetAuthor = async () => {
            if (!user) {
                setSelectedAuthor(null);
                return;
            }

            let authorToSet: PostAuthor | null = null;

            try {
                const groups = await groupService.getUserAdminGroups(user.id);
                console.log('Загружены администрируемые группы:', groups);
                setAdminGroups(groups);

                if (groupId) {
                    const group = groups.find(g => g.id === groupId);
                    if (group) {
                        console.log('Выбрана группа как автор:', group);
                        console.log('Аватар группы:', group.avatar);
                        authorToSet = {
                            id: group.id,
                            type: 'group',
                            name: group.name
                        };
                    } else {
                        console.warn(`Group with id ${groupId} not found, defaulting to user.`);
                        console.log('Аватар пользователя:', user.avatar);
                        authorToSet = {
                            id: user.id,
                            type: 'user',
                            name: `${user.firstName} ${user.lastName}`
                        };
                    }
                } else if (wallOwnerId && wallOwnerId !== user.id) {
                    // Если мы на стене другого пользователя
                    authorToSet = {
                        id: user.id,
                        type: 'user',
                        name: `${user.firstName} ${user.lastName}`
                    };
                } else {
                    console.log('Выбран пользователь как автор:', user);
                    console.log('Аватар пользователя:', user.avatar);
                    authorToSet = {
                        id: user.id,
                        type: 'user',
                        name: `${user.firstName} ${user.lastName}`
                    };
                }
            } catch (error) {
                console.error('Ошибка при загрузке администрируемых групп:', error);
                setError('Не удалось загрузить список групп');
                if (!authorToSet) {
                    authorToSet = {
                        id: user.id,
                        type: 'user',
                        name: `${user.firstName} ${user.lastName}`
                    };
                }
            } finally {
                console.log('Установлен автор:', authorToSet);
                setSelectedAuthor(authorToSet);
            }
        };

        loadAdminGroupsAndSetAuthor();
    }, [user, groupId, wallOwnerId]);

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

        // Фильтруем только альбомы с неудаленными фотографиями
        const nonEmptyAlbums = albums.filter(album => {
            // Проверяем наличие фотографий
            if (!album.photos || album.photos.length === 0) return false;
            
            // Проверяем наличие хотя бы одной неудаленной фотографии
            const activePhotos = album.photos.filter(photo => !photo.isDeleted);
            return activePhotos.length > 0;
        });
        
        // Если пытались добавить пустые альбомы или альбомы только с удаленными фотографиями, показываем предупреждение
        if (albums.length !== nonEmptyAlbums.length) {
            setError('Пустые альбомы или альбомы только с удаленными фотографиями не будут добавлены к посту');
        }

        const newAttachments: Attachment[] = [
            ...photos.map(photo => ({ type: 'photo' as const, id: photo.id, data: photo })),
            ...nonEmptyAlbums.map(album => ({ type: 'album' as const, id: album.id, data: album }))
        ];

        // Применяем прямое обновление состояния
        const updatedAttachments = [...attachments, ...newAttachments];
        setAttachments(updatedAttachments);

        // Устанавливаем состояние expanded, чтобы показать прикрепления
        setIsExpanded(true);

        setShowPhotoSelector(false);
        
        // Сбрасываем ошибку только если нет новых предупреждений
        if (albums.length === nonEmptyAlbums.length) {
            setError(null);
        }
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
        if (isSubmitting) return;

        if (!content.trim() && attachments.length === 0) {
            setError('Пост не может быть пустым. Добавьте текст или вложения.');
            return;
        }

        try {
            setIsSubmitting(true);
            setError(null);

            // Разделяем прикрепления по типам
            const photoIds = attachments
                .filter(a => a.type === 'photo')
                .map(a => a.id);
                
            const albumIds = attachments
                .filter(a => a.type === 'album')
                .map(a => a.id);
                
            const trackIds = attachments
                .filter(a => a.type === 'track')
                .map(a => a.id);
                
            const musicAlbumIds = attachments
                .filter(a => a.type === 'musicAlbum')
                .map(a => a.id);

            const authorType = selectedAuthor?.type || 'user';
            const authorId = selectedAuthor?.id || user?.id;

            // Формируем данные поста
            const postData = {
                content,
                photoIds,
                albumIds,
                trackIds,
                musicAlbumIds,
                authorType,
                authorId,
                wallOwnerId: wallOwnerId
            };

            console.log('Отправляем данные поста:', postData);
            const response = await api.post('/posts', postData);

            if (response) {
                setContent('');
                setAttachments([]);
                setIsExpanded(false);
                if (onSuccess) {
                    onSuccess();
                }
            }
        } catch (error) {
            console.error('Ошибка при создании поста:', error);
            setError('Не удалось создать пост');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTextareaFocus = () => {
        setIsExpanded(true);
    };

    // Функция для автоматического изменения высоты textarea
    const autoResizeTextarea = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // Сбрасываем высоту для корректного расчета
        textarea.style.height = 'auto';
        
        // Устанавливаем новую высоту по содержимому (scrollHeight включает padding)
        textarea.style.height = `${textarea.scrollHeight}px`;
    };

    // Обновляем обработчик изменения текста
    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        // Всегда разворачиваем форму при изменении текста или наличии вложений
        setIsExpanded(true);
        
        // Автоматически изменяем высоту
        setTimeout(autoResizeTextarea, 0);
    };

    // Инициализация автоматической высоты при монтировании и обновлении контента
    useEffect(() => {
        autoResizeTextarea();
    }, [content]);

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

    // Обработчик для закрытия селектора при клике вне его
    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
            setIsSelectorOpen(false);
        }
    }, []);

    useEffect(() => {
        // Добавляем обработчик события при монтировании
        document.addEventListener('mousedown', handleClickOutside);
        // Удаляем обработчик при размонтировании
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [handleClickOutside]);

    // Обработчик выбора опции в селекторе
    const handleAuthorSelect = (type: 'user' | 'group', id: number) => {
        if (type === 'user') {
            setSelectedAuthor({
                id: user?.id ?? 0,
                type: 'user',
                name: user ? `${user.firstName} ${user.lastName}` : 'Пользователь'
            });
        } else {
            const group = adminGroups.find(g => g.id === id);
            if (group) {
                setSelectedAuthor({
                    id: group.id,
                    type: 'group',
                    name: group.name
                });
            }
        }
        setIsSelectorOpen(false);
    };

    // Функция для перехода к странице пользователя или группы
    const handleAvatarClick = (event: React.MouseEvent, type: 'user' | 'group', id: number) => {
        event.stopPropagation(); // Предотвращаем всплытие события
        if (type === 'user') {
            navigate(`/users/${id}`);
        } else {
            navigate(`/groups/${id}`);
        }
    };

    // Обработчик выбора музыкальных альбомов
    const handleMusicAlbumsSelected = (albums: MusicAlbum[]) => {
        console.log('Выбраны музыкальные альбомы:', albums);
        
        const newAttachments = albums.map(album => ({
            type: 'musicAlbum' as const,
            id: album.id,
            data: album
        }));
        
        setAttachments(prev => [...prev, ...newAttachments]);
    };

    // Обработчик клика вне меню прикреплений
    const handleClickOutsideAttachMenu = useCallback((event: MouseEvent) => {
        if (attachMenuRef.current && !attachMenuRef.current.contains(event.target as Node)) {
            setShowAttachMenu(false);
        }
    }, []);

    useEffect(() => {
        // Добавляем обработчик события при открытии меню
        if (showAttachMenu) {
            document.addEventListener('mousedown', handleClickOutsideAttachMenu);
        } else {
            document.removeEventListener('mousedown', handleClickOutsideAttachMenu);
        }
        
        // Удаляем обработчик при размонтировании
        return () => {
            document.removeEventListener('mousedown', handleClickOutsideAttachMenu);
        };
    }, [showAttachMenu, handleClickOutsideAttachMenu]);

    // Обработчик для объединенного музыкального селектора
    const handleMusicSelectorClose = () => {
        setShowMusicSelector(false);
    };

    // Обновленный метод handlePhotoReorder для изменения порядка фотографий
    const handlePhotoReorder = (reorderedPhotos: Photo[]) => {
        // Получаем текущие вложения
        const currentAttachments = [...attachments];
        
        // Создаем карту ID фотографий для более быстрого поиска
        const photoMap: Record<number, PhotoAttachment> = {};
        currentAttachments
            .filter((a): a is PhotoAttachment => a.type === 'photo')
            .forEach(attachment => {
                photoMap[attachment.id] = attachment;
            });
        
        // Создаем новый порядок вложений
        const newPhotoAttachments: PhotoAttachment[] = reorderedPhotos.map(photo => {
            return photoMap[photo.id] || { type: 'photo', id: photo.id, data: photo };
        });
        
        // Фильтруем оригинальные вложения, удаляя фотографии
        const nonPhotoAttachments = currentAttachments.filter(a => a.type !== 'photo');
        
        // Соединяем переупорядоченные фотографии с остальными вложениями
        const updatedAttachments = [...newPhotoAttachments, ...nonPhotoAttachments];
        
        // Обновляем состояние
        setAttachments(updatedAttachments);
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
    const musicAlbumAttachments = attachments.filter((a): a is MusicAlbumAttachment => a.type === 'musicAlbum');
    const hasContent = content.trim().length > 0 || attachments.length > 0;

    return (
        <form
            ref={formRef}
            className={`${styles.createPostForm} ${isExpanded ? styles.expanded : ''}`}
            onSubmit={handleSubmit}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div className={styles.header}>
                {selectedAuthor && (
                    <div className={styles.authorSelector}>
                        <div 
                            className={styles.authorAvatar}
                            onClick={(e) => handleAvatarClick(e, selectedAuthor.type, selectedAuthor.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <ServerImage
                                alt={selectedAuthor.name}
                                className={styles.authorAvatar}
                                fallback={selectedAuthor.type === 'group' ? '/default-group-avatar.png' : '/default-avatar.png'}
                                userId={selectedAuthor.type === 'user' ? selectedAuthor.id : undefined}
                                groupId={selectedAuthor.type === 'group' ? selectedAuthor.id : undefined}
                                isAvatar={true}
                            />
                        </div>
                        {isFeedPage ? (
                            <div className={styles.customSelector} ref={selectorRef}>
                                <div 
                                    className={`${styles.selectorHeader} ${isSelectorOpen ? styles.open : ''}`}
                                    onClick={() => setIsSelectorOpen(!isSelectorOpen)}
                                >
                                    <span>{selectedAuthor.name}</span>
                                </div>
                                <div className={`${styles.selectorDropdown} ${isSelectorOpen ? styles.open : ''}`}>
                                    <div className={styles.optionCategory}>Стена</div>
                                    <div 
                                        className={`${styles.option} ${selectedAuthor.type === 'user' ? styles.selected : ''}`}
                                        onClick={() => handleAuthorSelect('user', user?.id ?? 0)}
                                    >
                                        <div 
                                            className={styles.optionAvatar}
                                            onClick={(e) => handleAvatarClick(e, 'user', user?.id ?? 0)}
                                        >
                                            <ServerImage
                                                alt={user ? `${user.firstName} ${user.lastName}` : 'Пользователь'}
                                                fallback={'/default-avatar.png'}
                                                userId={user?.id}
                                                isAvatar={true}
                                            />
                                        </div>
                                        <div className={styles.optionName}>
                                            {user ? `${user.firstName} ${user.lastName}` : 'Загрузка...'}
                                        </div>
                                    </div>
                                    
                                    {adminGroups.length > 0 && (
                                        <>
                                            <div className={styles.optionCategory}>Группы</div>
                                            {adminGroups.map(group => (
                                                <div 
                                                    key={group.id} 
                                                    className={`${styles.option} ${selectedAuthor.type === 'group' && selectedAuthor.id === group.id ? styles.selected : ''}`}
                                                    onClick={() => handleAuthorSelect('group', group.id)}
                                                >
                                                    <div 
                                                        className={styles.optionAvatar}
                                                        onClick={(e) => handleAvatarClick(e, 'group', group.id)}
                                                    >
                                                        <ServerImage
                                                            alt={group.name}
                                                            fallback={'/default-group-avatar.png'}
                                                            groupId={group.id}
                                                            isAvatar={true}
                                                        />
                                                    </div>
                                                    <div className={styles.optionName}>{group.name}</div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className={styles.authorName}>
                                {selectedAuthor.name}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div className={styles.content}>
                <textarea
                    ref={textareaRef}
                    placeholder="Что у вас нового?"
                    value={content}
                    onChange={handleTextareaChange}
                    onFocus={handleTextareaFocus}
                    className={styles.textarea}
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
                                onPhotosReorder={handlePhotoReorder}
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

            {showMusicSelector && (
                <MusicSelector
                    isOpen={showMusicSelector}
                    onClose={handleMusicSelectorClose}
                    onTracksSelected={handleTracksSelected}
                    onAlbumsSelected={handleMusicAlbumsSelected}
                    userId={user?.id}
                />
            )}

            {musicAlbumAttachments.length > 0 && (
                <div className={styles.attachmentSection}>
                    <h6 className={styles.attachmentSectionTitle}>
                        Музыкальные альбомы ({musicAlbumAttachments.length})
                    </h6>
                    <div className={styles.albumsList}>
                        {musicAlbumAttachments.map((attachment) => (
                            <div key={`music-album-${attachment.id}`} className={styles.albumItem}>
                                <UniversalMusicAlbumItem 
                                    album={attachment.data as MusicAlbum} 
                                    variant="compact"
                                />
                                <button
                                    className={styles.removeButton}
                                    onClick={() => handleAttachmentDelete(attachment)}
                                    title="Удалить альбом"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
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

<div className={styles.mediaSection}>
                <div className={styles.attachButtonWrapper} ref={attachMenuRef}>
                    <button
                        type="button"
                        className={styles.attachButton}
                        onClick={() => setShowAttachMenu(!showAttachMenu)}
                        disabled={isSubmitting}
                    >
                        <AttachFileIcon sx={{ fontSize: 'var(--icon-size-small)' }} />
                        Прикрепить
                    </button>
                    {showAttachMenu && (
                        <div className={styles.attachDropdown}>
                            <div 
                                className={styles.attachOption}
                                onClick={() => {
                                    setShowPhotoSelector(true);
                                    setShowAttachMenu(false);
                                }}
                            >
                                <PhotoIcon sx={{ fontSize: 'var(--icon-size-small)' }} />
                                Фото/Альбом
                            </div>
                            <div 
                                className={styles.attachOption}
                                onClick={() => {
                                    setShowMusicSelector(true);
                                    setShowAttachMenu(false);
                                }}
                            >
                                <MusicNoteIcon sx={{ fontSize: 'var(--icon-size-small)' }} />
                                Музыка
                            </div>
                            <div 
                                className={styles.attachOption}
                                onClick={() => {
                                    setShowAudioUploader(true);
                                    setShowAttachMenu(false);
                                }}
                            >
                                <UploadIcon sx={{ fontSize: 'var(--icon-size-small)' }} />
                                Загрузить аудио
                            </div>
                        </div>
                    )}
                </div>
                
                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={!hasContent || isSubmitting}
                >
                    {isSubmitting ? 'Отправка...' : 'Опубликовать'}
                </button>
            </div>
        </form>
    );
}; 