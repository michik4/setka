import { Track } from './music.types';

interface MusicAlbum {
    id: number;
    name: string;
    artist: string;
    artistVsetiUserId?: number;
    coverUrl: string;
    createdAt: string;
    updatedAt: string;
    isPublic: boolean;
    isDeleted: boolean;
    isActive: boolean;
    tracks: Track[];
}

export default MusicAlbum;
