import { API_URL } from "../config/constants";

interface imageUtilMethods {
    getImgSrcByPath: (path: string) => string,
}

export const imageUtil: imageUtilMethods = {
    getImgSrcByPath: (path: string) => {
        let imageSrc = '';
        if (path.startsWith('http')) {
            // Внешний URL (например, https://example.com/image.jpg)
            imageSrc = path;
        } else if (path.startsWith('placeholder_')) {
            // Временные файлы
            imageSrc = `${API_URL}/temp/${path}`;
        } else if (path.startsWith('/api/')) {
            // Уже полный относительный путь API (например, /api/music/cover/default.png)
            // Исправлена ошибка: теперь не добавляем /api/ дважды
            const apiPath = path.startsWith('/api') ? path : `/api${path}`;
            imageSrc = `${API_URL.replace('/api', '')}${apiPath}`;
        } else {
            // Стандартные фотографии
            imageSrc = `${API_URL}/photos/file/${path}`;
        }
        return imageSrc;
    },
};
