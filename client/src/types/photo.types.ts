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