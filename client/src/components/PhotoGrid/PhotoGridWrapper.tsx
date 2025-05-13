import { Photo } from "../../types/photo.types";
import { PhotoGrid } from "./PhotoGrid";
import styles from "./PhotoGrid.module.css";

interface PhotoGridProps {
    photos: Photo[];
    onPhotoDelete?: (photo: Photo) => void;
    canDelete?: boolean;
    isEditing?: boolean;
    isWallPost?: boolean;
    onPhotoClick?: (photo: Photo, index: number) => void;
}

export const PhotoGridWrapper: React.FC<PhotoGridProps> = ({
    photos,
    onPhotoDelete,
    canDelete = false,
    isEditing = false,
    isWallPost = false,
    onPhotoClick
}) => {
    // Проверка наличия фотографий для предотвращения отображения пустого контейнера
    if (!photos || photos.length === 0) {
        return null;
    }
    
    return (
        <div className={styles.photoGridWrapper}>
            <PhotoGrid 
                photos={photos} 
                onPhotoDelete={onPhotoDelete} 
                canDelete={canDelete} 
                isEditing={isEditing} 
                isWallPost={isWallPost} 
                onPhotoClick={onPhotoClick} 
            />
        </div>
    );
}
