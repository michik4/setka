/**
 * Функция для форматирования времени в формат mm:ss
 * @param seconds - количество секунд для форматирования
 * @returns отформатированная строка времени
 */
export const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return '0:00';
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}; 