import React, { useEffect, useRef, useState } from 'react';
import { Photo } from '../../types/photo.types';
import { ServerImage } from '../ServerImage/ServerImage';
import { createPhotoGrid, gridItemToStyle } from '../../utils/photoGridUtils';
import styles from './PhotoGrid.module.css';

interface PhotoGridProps {
    photos: Photo[];
    onPhotoDelete?: (photo: Photo) => void;
    canDelete?: boolean;
    isEditing?: boolean;
    isWallPost?: boolean;
    onPhotoClick?: (photo: Photo, index: number) => void;
}

export const PhotoGrid: React.FC<PhotoGridProps> = ({
    photos,
    onPhotoDelete,
    canDelete = false,
    isEditing = false,
    onPhotoClick
}) => {
    const gridRef = useRef<HTMLDivElement>(null);
    const [gridItems, setGridItems] = useState<any[]>([]);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [gridHeight, setGridHeight] = useState<number>(0);
    
    useEffect(() => {
        if (!photos.length) return;
        
        // Функция для расчета сетки при изменении ширины контейнера
        const calculateGrid = () => {
            if (gridRef.current) {
                const width = gridRef.current.offsetWidth;
                setContainerWidth(width);
                
                // Анализируем фотографии для определения подходящего соотношения сторон сетки
                let targetRatio = 4/3; // Стандартное соотношение для сетки
                
                // Для альбомов с преимущественно горизонтальными фото используем более широкое соотношение
                // Для альбомов с преимущественно вертикальными фото - более узкое
                const photoRatios = photos.map(photo => {
                    // Пытаемся извлечь размеры из имени файла
                    const dimensions = photo.path ? photo.path.match(/(\d+)x(\d+)/i) : null;
                    if (dimensions && dimensions.length === 3) {
                        const width = parseInt(dimensions[1], 10);
                        const height = parseInt(dimensions[2], 10);
                        if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                            return width / height;
                        }
                    }
                    return 0; // Неизвестное соотношение
                }).filter(ratio => ratio > 0);
                
                if (photoRatios.length > 0) {
                    // Считаем средневзвешенное соотношение сторон всех фотографий
                    const avgRatio = photoRatios.reduce((sum, ratio) => sum + ratio, 0) / photoRatios.length;
                    
                    // Определяем, какая ориентация преобладает
                    const horizontalCount = photoRatios.filter(ratio => ratio > 1).length;
                    const verticalCount = photoRatios.length - horizontalCount;
                    
                    if (horizontalCount > verticalCount) {
                        // Преобладают горизонтальные фото
                        targetRatio = Math.max(4/3, avgRatio * 0.8);
                    } else if (verticalCount > horizontalCount) {
                        // Преобладают вертикальные фото
                        targetRatio = Math.min(4/3, avgRatio * 1.2);
                    }
                }
                
                // Используем минимальную высоту 120px для лучшего отображения фотографий
                const items = createPhotoGrid(photos, width, targetRatio, 120);
                setGridItems(items);
                
                // Устанавливаем высоту сетки
                if (items.length > 0) {
                    const maxHeight = Math.max(...items.map(item => item.top + item.height));
                    setGridHeight(maxHeight);
                }
            }
        };

        // Рассчитываем сетку при монтировании компонента
        calculateGrid();

        // Рассчитываем сетку при изменении размера окна
        const handleResize = () => {
            calculateGrid();
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [photos]);
    
    // Проверка на наличие фотографий после объявления всех хуков
    if (!photos.length) return null;

    const handlePhotoClick = (e: React.MouseEvent, photo: Photo, index: number) => {
        // Проверяем, что клик был не по кнопке удаления
        if (!(e.target as HTMLElement).closest(`.${styles.deleteButton}`)) {
            onPhotoClick?.(photo, index);
        }
    };

    const handleDelete = async (e: React.MouseEvent, photo: Photo) => {
        e.stopPropagation(); // Предотвращаем открытие просмотрщика
        if (isEditing) {
            onPhotoDelete?.(photo);
            return;
        }

        // При удалении фото из просмотра запрашиваем подтверждение
        if (!window.confirm('Вы уверены, что хотите удалить эту фотографию?')) {
            return;
        }
        onPhotoDelete?.(photo);
    };

    // Количество дополнительных фотографий, если показываем не все
    const maxVisiblePhotos = 10;
    const remainingPhotos = photos.length > maxVisiblePhotos ? photos.length - maxVisiblePhotos : 0;

    return (
        <div 
            ref={gridRef} 
            className={styles.photoGrid} 
            style={{ 
                position: 'relative', 
                height: `${gridHeight}px`,
                width: '100%'
            }}
        >
            {gridItems.map((item, index) => (
                index < maxVisiblePhotos && (
                    <div
                        key={item.photo.id}
                        className={styles.photoWrapper}
                        style={gridItemToStyle(item)}
                        onClick={(e) => handlePhotoClick(e, item.photo, index)}
                        data-remaining={index === maxVisiblePhotos - 1 ? remainingPhotos : 0}
                    >
                        <ServerImage
                            path={item.photo.path}
                            alt={item.photo.description || `Фото ${index + 1}`}
                            className={styles.photo}
                            isDeleted={item.photo.isDeleted}
                            extension={item.photo.extension}
                        />
                        {isEditing && canDelete && !item.photo.isDeleted && (
                            <button
                                type="button"
                                className={styles.deleteButton}
                                onClick={(e) => handleDelete(e, item.photo)}
                                title="Удалить фото"
                            />
                        )}
                        
                        {/* Показываем индикатор количества оставшихся фото */}
                        {index === maxVisiblePhotos - 1 && remainingPhotos > 0 && (
                            <div className={styles.remainingIndicator}>
                                +{remainingPhotos}
                            </div>
                        )}
                    </div>
                )
            ))}
        </div>
    );
}; 
