interface Track {
    id: number;
    title: string;
    artist: string;
    duration: string;
    coverUrl: string;
    audioUrl: string;
    playCount: number;
    filename?: string;
    source?: {
        type: string;
        postId?: number;
        authorId?: number;
        authorName?: string;
        
        // Другие возможные поля, характеризующие источник
    };
    trackAlbumId?: number;
    trackAlbumName?: string;
}

interface MusicAlbum {
    id: number;
    title: string;
    description?: string;
    userId: number;
    coverUrl?: string;
    tracksCount: number;
    isPrivate: boolean;
    createdAt: string;
    updatedAt: string;
    tracks?: Track[];
}

export type { Track, MusicAlbum };