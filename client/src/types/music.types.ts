interface Track {
    id: number;
    title: string;
    artist: string;
    duration: string;
    coverUrl: string;
    audioUrl: string;
    playCount: number;
    source?: {
        type: string;
        postId?: number;
        authorId?: number;
        authorName?: string;
        // Другие возможные поля, характеризующие источник
    };
}

export type { Track };