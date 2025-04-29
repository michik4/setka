// API URL
export const API_URL = process.env.REACT_APP_API_URL || '/api';

// Медиа URL
export const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || '/api/media';

// Обложка по умолчанию для треков и альбомов
export const DEFAULT_COVER_URL = '/api/music/cover/default.png'; 

// Константы для плеера
export const PLAYER_SYNC_CHANNEL = 'player-sync';
export const ACTIVE_PLAYER_STORAGE_KEY = 'active-player';
export const PLAYER_SESSION_KEY = 'player-session';
export const SHUFFLE_QUEUE_KEY = 'shuffle-queue'; 