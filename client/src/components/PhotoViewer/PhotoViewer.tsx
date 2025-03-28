import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Photo } from '../../types/post.types';
import { ServerImage } from '../ServerImage/ServerImage';
import styles from './PhotoViewer.module.css';

// Варианты отображения фотографий в очереди
type QueueViewMode = 'single' | 'double' | 'triple';

interface PhotoViewerProps {
    photo: Photo;
    onClose: () => void;
    onDelete?: () => void;
    canDelete?: boolean;
    isWallPost?: boolean;
    allPhotos?: Photo[];
    currentIndex?: number;
    onPhotoChange?: (photo: Photo) => void;
}

// Глобальный кэш для предотвращения повторной загрузки
const preloadedPhotosCache = new Set<string>();

// Компонент для предварительной загрузки изображений (один на приложение)
const ImagePreloader: React.FC<{ photos: Photo[] }> = ({ photos }) => {
    if (!photos.length) return null;

    return (
        <div style={{ 
            display: 'none', 
            position: 'absolute', 
            pointerEvents: 'none', 
            opacity: 0, 
            width: 0, 
            height: 0, 
            overflow: 'hidden' 
        }}>
            {photos.map(photo => {
                // Только если фото еще не кэшировано
                if (preloadedPhotosCache.has(photo.path)) return null;
                
                // Добавляем в кэш для предотвращения повторной загрузки
                preloadedPhotosCache.add(photo.path);
                
                return (
                    <img 
                        key={photo.id} 
                        src={photo.path} 
                        alt="preload" 
                    />
                );
            })}
        </div>
    );
};

export const PhotoViewer: React.FC<PhotoViewerProps> = ({ 
    photo, 
    onClose, 
    onDelete,
    canDelete = false,
    isWallPost = false,
    allPhotos,
    currentIndex,
    onPhotoChange
}) => {
    const [displayedPhoto, setDisplayedPhoto] = useState<Photo>(photo);
    const [displayedIndex, setDisplayedIndex] = useState<number | undefined>(currentIndex);
    const [direction, setDirection] = useState<'forward' | 'backward' | null>(null);
    const [transitioning, setTransitioning] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [containerHeight, setContainerHeight] = useState<number | null>(null);
    const [showQueue, setShowQueue] = useState(false);
    const [queueViewMode, setQueueViewMode] = useState<QueueViewMode>('single');
    const imageRef = useRef<HTMLImageElement>(null);
    
    // Обновляем отображаемое фото при изменении входящего фото
    useEffect(() => {
        setDisplayedPhoto(photo);
        setDisplayedIndex(currentIndex);
        setImageLoaded(false);
    }, [photo.id, currentIndex]);
    
    // Получаем соседние фотографии для предзагрузки с помощью useMemo
    const adjacentPhotos = useMemo(() => {
        if (!allPhotos || currentIndex === undefined) return [];
        
        const result: Photo[] = [];
        
        // Собираем все фотографии для предварительной загрузки
        allPhotos.forEach((photo, index) => {
            // Пропускаем текущее фото
            if (index !== currentIndex) {
                result.push(photo);
            }
        });
        
        return result;
    }, [allPhotos, currentIndex]);

    const hasMultiplePhotos = allPhotos && allPhotos.length > 1;
    const isFirstPhoto = displayedIndex === 0;
    const isLastPhoto = displayedIndex === (allPhotos?.length || 0) - 1;

    // Обработчик загрузки изображения
    const handleImageLoad = () => {
        setImageLoaded(true);
        if (imageRef.current) {
            setContainerHeight(imageRef.current.offsetHeight);
        }
    };

    // Обработчик переключения очереди
    const handleToggleQueue = () => {
        setShowQueue(prev => !prev);
    };

    // Обработчик изменения режима отображения очереди
    const handleViewModeChange = (mode: QueueViewMode) => {
        setQueueViewMode(mode);
    };

    // Обработчик клика по миниатюре в очереди
    const handleQueueItemClick = (index: number) => {
        if (allPhotos && index !== displayedIndex) {
            setDirection(index > (displayedIndex || 0) ? 'forward' : 'backward');
            setTransitioning(true);
            setImageLoaded(false);
            setDisplayedIndex(index);
            setDisplayedPhoto(allPhotos[index]);
            
            setTimeout(() => {
                onPhotoChange?.(allPhotos[index]);
                setTransitioning(false);
            }, 150);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Вы уверены, что хотите удалить эту фотографию?')) {
            return;
        }

        try {
            onClose();
            if (onDelete) {
                onDelete();
            }
        } catch (error) {
            console.error('Ошибка при удалении фотографии:', error);
            alert('Не удалось удалить фотографию');
        }
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handlePrevPhoto = () => {
        if (!allPhotos || displayedIndex === undefined || displayedIndex <= 0 || transitioning) return;
        
        setDirection('backward');
        setTransitioning(true);
        setImageLoaded(false);
        
        const newIndex = displayedIndex - 1;
        setDisplayedIndex(newIndex);
        setDisplayedPhoto(allPhotos[newIndex]);
        
        // Уменьшаем задержку до 150мс
        setTimeout(() => {
            onPhotoChange?.(allPhotos[newIndex]);
            setTransitioning(false);
        }, 150);
    };

    const handleNextPhoto = () => {
        if (!allPhotos || displayedIndex === undefined || displayedIndex >= allPhotos.length - 1 || transitioning) return;
        
        setDirection('forward');
        setTransitioning(true);
        setImageLoaded(false);
        
        const newIndex = displayedIndex + 1;
        setDisplayedIndex(newIndex);
        setDisplayedPhoto(allPhotos[newIndex]);
        
        // Уменьшаем задержку до 150мс
        setTimeout(() => {
            onPhotoChange?.(allPhotos[newIndex]);
            setTransitioning(false);
        }, 150);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'ArrowLeft' && !isFirstPhoto && !transitioning) {
                handlePrevPhoto();
            } else if (e.key === 'ArrowRight' && !isLastPhoto && !transitioning) {
                handleNextPhoto();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isFirstPhoto, isLastPhoto, transitioning]);

    // Определение класса анимации
    const getAnimationClass = () => {
        if (!direction) return '';
        return direction === 'forward' ? styles.slideForward : styles.slideBackward;
    };

    // Определение класса режима просмотра для очереди
    const getQueueListClassName = () => {
        switch (queueViewMode) {
            case 'double':
                return styles.queueListDouble;
            case 'triple':
                return styles.queueListTriple;
            case 'single':
            default:
                return styles.queueListSingle;
        }
    };

    const containerStyle = containerHeight && !imageLoaded
        ? { height: `${containerHeight}px` }
        : {};

    return (
        <div className={`${styles.photoViewer} ${showQueue ? styles.queueActive : ''}`} onClick={handleBackgroundClick}>
            {/* Предзагрузка всех фотографий в альбоме */}
            {hasMultiplePhotos && <ImagePreloader photos={adjacentPhotos} />}
            
            <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
                ✕
            </button>
            
            {hasMultiplePhotos && (
                <button 
                    className={`${styles.queueButton} ${showQueue ? styles.queueButtonActive : ''}`} 
                    onClick={handleToggleQueue}
                    aria-label={showQueue ? "Скрыть очередь" : "Показать очередь"}
                >
                    <span className={styles.queueIcon}></span>
                </button>
            )}
            
            {/* Боковая панель с очередью фотографий */}
            {hasMultiplePhotos && showQueue && (
                <div className={styles.queuePanel}>
                    <div className={styles.queueHeader}>
                        <div className={styles.queueTitle}>Фото в альбоме</div>
                        <div className={styles.viewModeButtons}>
                            <button 
                                className={`${styles.viewModeButton} ${queueViewMode === 'single' ? styles.viewModeButtonActive : ''}`} 
                                onClick={() => handleViewModeChange('single')}
                                aria-label="Одна фотография в строке"
                            >
                                <span className={styles.viewModeIcon1}></span>
                            </button>
                            <button 
                                className={`${styles.viewModeButton} ${queueViewMode === 'double' ? styles.viewModeButtonActive : ''}`} 
                                onClick={() => handleViewModeChange('double')}
                                aria-label="Две фотографии в строке"
                            >
                                <span className={styles.viewModeIcon2}></span>
                            </button>
                            <button 
                                className={`${styles.viewModeButton} ${queueViewMode === 'triple' ? styles.viewModeButtonActive : ''}`} 
                                onClick={() => handleViewModeChange('triple')}
                                aria-label="Три фотографии в строке"
                            >
                                <span className={styles.viewModeIcon3}></span>
                            </button>
                        </div>
                    </div>
                    <div className={getQueueListClassName()}>
                        {allPhotos?.map((queuePhoto, index) => (
                            <div 
                                key={queuePhoto.id}
                                className={`${styles.queueItem} ${index === displayedIndex ? styles.queueItemActive : ''}`}
                                onClick={() => handleQueueItemClick(index)}
                            >
                                <ServerImage
                                    path={queuePhoto.path}
                                    alt={queuePhoto.description || `Фото ${index + 1}`}
                                    className={styles.queueItemImage}
                                    isDeleted={queuePhoto.isDeleted}
                                    extension={queuePhoto.extension}
                                    forceCachedImage={true}
                                />
                                <div className={styles.queueItemNumber}>{index + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div 
                className={`${styles.photoContainer} ${!imageLoaded ? styles.loading : ''} ${showQueue ? styles.photoContainerShifted : ''}`}
                style={containerStyle}
            >
                {!imageLoaded && containerHeight && (
                    <div className={styles.photoPlaceholder}>
                        <div className={styles.loadingSpinner}></div>
                    </div>
                )}
                
                <ServerImage
                    ref={imageRef}
                    path={displayedPhoto.path}
                    alt={displayedPhoto.description || 'Фото'}
                    className={`${styles.photo} ${getAnimationClass()}`}
                    isDeleted={displayedPhoto.isDeleted}
                    extension={displayedPhoto.extension}
                    forceCachedImage={true}
                    onLoad={handleImageLoad}
                />
                
                {hasMultiplePhotos && (
                    <div className={styles.photoCounter}>
                        {displayedIndex !== undefined ? displayedIndex + 1 : 0} / {allPhotos?.length}
                    </div>
                )}

                <div className={styles.photoMenu}>
                    {canDelete && !displayedPhoto.isDeleted && (
                        <button 
                            className={`${styles.menuButton} ${styles.deleteButton}`}
                            onClick={handleDelete}
                            aria-label="Удалить фотографию"
                        >
                            <span role="img" aria-hidden="true">🗑️</span> Удалить
                        </button>
                    )}
                    {!displayedPhoto.isDeleted && (
                        <button 
                            className={styles.menuButton}
                            onClick={() => window.open(displayedPhoto.path, '_blank')}
                            aria-label="Открыть оригинал"
                        >
                            <span role="img" aria-hidden="true">🔍</span> Оригинал
                        </button>
                    )}
                </div>

                {/* Кнопки навигации */}
                {hasMultiplePhotos && !isFirstPhoto && (
                    <button 
                        className={`${styles.navButton} ${styles.prevButton}`}
                        onClick={handlePrevPhoto}
                        disabled={transitioning}
                        aria-label="Предыдущая фотография"
                    />
                )}
                
                {hasMultiplePhotos && !isLastPhoto && (
                    <button 
                        className={`${styles.navButton} ${styles.nextButton}`}
                        onClick={handleNextPhoto}
                        disabled={transitioning}
                        aria-label="Следующая фотография"
                    />
                )}
            </div>
        </div>
    );
}; 