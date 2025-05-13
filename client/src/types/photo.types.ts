export interface Photo {
    id: number;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    extension: string;
    isDeleted: boolean;
    userId: number;
    description?: string;
    createdAt: string;
} 

export interface PhotoGridItem {
    serialNumber: number,
    relatedPhoto: Photo,
    renderedPhoto?: React.ReactNode,
    isRendered: boolean,
    width?: number,
    height?: number,
    ratio?: number,
}

export interface PhotoGrid {
    photos: PhotoGridItem[],
    gridLineHeight: number,
}