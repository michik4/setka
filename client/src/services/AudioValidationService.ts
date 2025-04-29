/**
 * Сервис для валидации аудио и диагностики проблем воспроизведения
 * Дополняет AudioChannelService и предоставляет функции для проверки
 * валидности аудиоданных и обработки ошибок воспроизведения
 */
export class AudioValidationService {
  private static instance: AudioValidationService;
  private errorLog: Map<string, { count: number, lastTime: number, messages: string[] }> = new Map();
  private audioSources: Map<string, { url: string, loaded: boolean, error: string | null }> = new Map();
  
  /**
   * Получение синглтон-экземпляра сервиса
   */
  public static getInstance(): AudioValidationService {
    if (!AudioValidationService.instance) {
      AudioValidationService.instance = new AudioValidationService();
    }
    return AudioValidationService.instance;
  }
  
  /**
   * Проверка валидности аудио URL
   * @param audioUrl URL аудио файла для проверки
   * @param trackId ID трека для логирования
   * @returns Promise с результатом проверки
   */
  public validateAudioUrl(audioUrl: string, trackId: string | number): Promise<boolean> {
    const sourceKey = `${trackId}:${audioUrl}`;
    
    // Если источник уже проверен и валиден, сразу возвращаем true
    if (this.audioSources.has(sourceKey) && this.audioSources.get(sourceKey)?.loaded) {
      return Promise.resolve(true);
    }
    
    // Если источник проверен и невалиден, возвращаем false
    if (this.audioSources.has(sourceKey) && this.audioSources.get(sourceKey)?.error) {
      return Promise.resolve(false);
    }
    
    // Регистрируем источник как проверяемый
    this.audioSources.set(sourceKey, { url: audioUrl, loaded: false, error: null });
    
    // Проверяем доступность аудио через HEAD запрос
    return fetch(audioUrl, { method: 'HEAD' })
      .then(response => {
        const isValid = response.ok;
        this.audioSources.set(sourceKey, { 
          url: audioUrl, 
          loaded: isValid, 
          error: isValid ? null : `HTTP status: ${response.status}` 
        });
        return isValid;
      })
      .catch(error => {
        this.audioSources.set(sourceKey, { 
          url: audioUrl, 
          loaded: false, 
          error: error.message 
        });
        this.logError('validate_audio', `Ошибка валидации аудио ${trackId}: ${error.message}`);
        return false;
      });
  }
  
  /**
   * Предварительная загрузка аудио данных для проверки валидности
   * @param audioUrl URL аудио для предзагрузки
   * @param trackId ID трека для логирования
   * @returns Promise с объектом аудио при успехе или null при ошибке
   */
  public preloadAudio(audioUrl: string, trackId: string | number): Promise<HTMLAudioElement | null> {
    return new Promise((resolve) => {
      const sourceKey = `${trackId}:${audioUrl}`;
      const audio = new Audio();
      
      const onCanPlayThrough = () => {
        audio.removeEventListener('canplaythrough', onCanPlayThrough);
        audio.removeEventListener('error', onError);
        this.audioSources.set(sourceKey, { url: audioUrl, loaded: true, error: null });
        resolve(audio);
      };
      
      const onError = (error: ErrorEvent) => {
        audio.removeEventListener('canplaythrough', onCanPlayThrough);
        audio.removeEventListener('error', onError);
        const errorMessage = error.message || 'Неизвестная ошибка аудио';
        this.audioSources.set(sourceKey, { url: audioUrl, loaded: false, error: errorMessage });
        this.logError('preload_audio', `Ошибка предзагрузки аудио ${trackId}: ${errorMessage}`);
        resolve(null);
      };
      
      audio.addEventListener('canplaythrough', onCanPlayThrough);
      audio.addEventListener('error', onError);
      
      // Устанавливаем таймаут для предотвращения зависания
      setTimeout(() => {
        if (!this.audioSources.has(sourceKey) || !this.audioSources.get(sourceKey)?.loaded) {
          audio.removeEventListener('canplaythrough', onCanPlayThrough);
          audio.removeEventListener('error', onError);
          this.audioSources.set(sourceKey, { 
            url: audioUrl, 
            loaded: false, 
            error: 'Timeout during preload' 
          });
          this.logError('preload_audio', `Таймаут предзагрузки аудио ${trackId}`);
          resolve(null);
        }
      }, 10000); // 10 секунд таймаут
      
      // Начинаем загрузку
      audio.src = audioUrl;
      audio.preload = 'auto';
      audio.load();
    });
  }
  
  /**
   * Регистрация ошибки воспроизведения для анализа
   * @param errorType Тип ошибки
   * @param errorMessage Сообщение ошибки
   */
  public logError(errorType: string, errorMessage: string): void {
    const now = Date.now();
    
    if (!this.errorLog.has(errorType)) {
      this.errorLog.set(errorType, { count: 1, lastTime: now, messages: [errorMessage] });
    } else {
      const errorData = this.errorLog.get(errorType)!;
      errorData.count++;
      errorData.lastTime = now;
      errorData.messages.push(errorMessage);
      
      // Ограничиваем количество сообщений для экономии памяти
      if (errorData.messages.length > 20) {
        errorData.messages = errorData.messages.slice(-20);
      }
      
      this.errorLog.set(errorType, errorData);
    }
    
    // Логируем в консоль для отладки
    console.error(`[AudioValidation] [${errorType}] ${errorMessage}`);
  }
  
  /**
   * Диагностика потенциальных проблем с аудио системой
   * @returns Массив обнаруженных проблем
   */
  public diagnoseAudioIssues(): string[] {
    const issues: string[] = [];
    
    // Проверяем количество накопленных ошибок
    this.errorLog.forEach((errorData, errorType) => {
      // Если много ошибок одного типа за короткий период
      if (errorData.count > 5 && (Date.now() - errorData.lastTime < 60000)) {
        issues.push(`Частые ошибки типа "${errorType}": ${errorData.count} за последнюю минуту.`);
      }
    });
    
    // Проверяем проблемы с источниками аудио
    let invalidSources = 0;
    this.audioSources.forEach((sourceData) => {
      if (!sourceData.loaded && sourceData.error) {
        invalidSources++;
      }
    });
    
    if (invalidSources > 3) {
      issues.push(`Обнаружено ${invalidSources} невалидных источников аудио.`);
    }
    
    return issues;
  }
  
  /**
   * Получение статистики по ошибкам
   */
  public getErrorStats(): { [key: string]: { count: number, lastTime: number } } {
    const stats: { [key: string]: { count: number, lastTime: number } } = {};
    
    this.errorLog.forEach((errorData, errorType) => {
      stats[errorType] = { 
        count: errorData.count, 
        lastTime: errorData.lastTime 
      };
    });
    
    return stats;
  }
  
  /**
   * Сброс статистики ошибок
   */
  public resetErrorStats(): void {
    this.errorLog.clear();
  }
}

// Экспорт синглтон-экземпляра для использования во всем приложении
export const audioValidationService = AudioValidationService.getInstance();
export default audioValidationService; 