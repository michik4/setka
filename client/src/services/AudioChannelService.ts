import { Track } from '../types/music.types';

/**
 * Класс для управления каналами воспроизведения аудио
 * Предотвращает конфликты между различными источниками аудио
 * и обеспечивает однозначное воспроизведение только в одном канале
 */
class AudioChannelService {
  private static instance: AudioChannelService;
  private audioElements: Map<string, HTMLAudioElement> = new Map();
  private activeChannelId: string | null = null;
  private activeAudio: HTMLAudioElement | null = null;
  private currentTrackId: number | string | null = null;
  private masterChannelId: string | null = null;
  private lastPlayTimestamp: number = 0;

  /**
   * Получение синглтон-экземпляра сервиса
   */
  public static getInstance(): AudioChannelService {
    if (!AudioChannelService.instance) {
      AudioChannelService.instance = new AudioChannelService();
    }
    return AudioChannelService.instance;
  }

  /**
   * Регистрация аудиоэлемента в сервисе
   * @param channelId Уникальный идентификатор канала
   * @param audio HTMLAudioElement для регистрации
   * @param isMaster Является ли этот канал мастер-каналом (приоритетным)
   */
  public registerAudio(channelId: string, audio: HTMLAudioElement, isMaster: boolean = false): void {
    if (this.audioElements.has(channelId)) {
      console.warn(`[AudioChannelService] Канал с ID ${channelId} уже зарегистрирован, заменяем`);
      const oldAudio = this.audioElements.get(channelId);
      if (oldAudio) {
        oldAudio.pause();
      }
    }

    // Регистрируем аудиоэлемент
    this.audioElements.set(channelId, audio);
    console.log(`[AudioChannelService] Зарегистрирован аудио канал ${channelId}, всего каналов: ${this.audioElements.size}`);

    // Если это мастер-канал, запоминаем его ID
    if (isMaster && (!this.masterChannelId || channelId !== this.masterChannelId)) {
      this.setMasterChannel(channelId);
    }

    // Добавляем слушатель события play, чтобы перехватывать попытки воспроизведения
    audio.addEventListener('play', () => this.handleAudioPlay(channelId));
  }

  /**
   * Установка мастер-канала (приоритетного)
   * @param channelId ID канала, который станет мастером
   */
  public setMasterChannel(channelId: string): boolean {
    if (!this.audioElements.has(channelId)) {
      console.error(`[AudioChannelService] Канал ${channelId} не найден для назначения мастером`);
      return false;
    }

    this.masterChannelId = channelId;
    console.log(`[AudioChannelService] Канал ${channelId} установлен как мастер`);
    return true;
  }

  /**
   * Удаление аудиоэлемента из сервиса
   * @param channelId ID канала для удаления
   */
  public unregisterAudio(channelId: string): void {
    if (this.audioElements.has(channelId)) {
      // Если канал активный, останавливаем воспроизведение
      if (this.activeChannelId === channelId) {
        const audio = this.audioElements.get(channelId);
        if (audio) {
          audio.pause();
        }
        this.activeChannelId = null;
        this.activeAudio = null;
      }

      // Удаляем канал из списка
      this.audioElements.delete(channelId);
      
      // Если удалили мастер-канал, сбрасываем его
      if (this.masterChannelId === channelId) {
        this.masterChannelId = null;
      }

      console.log(`[AudioChannelService] Удален аудио канал ${channelId}, осталось каналов: ${this.audioElements.size}`);
    }
  }

  /**
   * Воспроизведение трека в указанном канале
   * @param channelId ID канала
   * @param track Трек для воспроизведения
   * @param position Позиция для начала воспроизведения (в секундах)
   * @param forcePlay Принудительное воспроизведение даже если трек тот же
   * @returns Успешность операции
   */
  public playTrack(channelId: string, track: Track, position: number = 0, forcePlay: boolean = false): boolean {
    // Если канал не зарегистрирован, отказываем
    if (!this.audioElements.has(channelId)) {
      console.error(`[AudioChannelService] Канал ${channelId} не найден для воспроизведения`);
      // Выведем все зарегистрированные каналы для диагностики
      console.log(`[AudioChannelService] Зарегистрированные каналы: [${Array.from(this.audioElements.keys()).join(', ')}]`);
      return false;
    }

    const audio = this.audioElements.get(channelId)!;
    const isSameTrack = this.currentTrackId === track.id;
    const isSameChannel = this.activeChannelId === channelId;
    
    console.log(`[AudioChannelService] Запрос на воспроизведение трека ${track.title} в канале ${channelId}, текущий активный канал: ${this.activeChannelId}, текущий трек: ${this.currentTrackId}`);
    
    // Проверяем, не пытаемся ли воспроизвести тот же трек без необходимости
    if (isSameTrack && isSameChannel && !forcePlay) {
      // Если трек тот же и канал тот же, просто переключаем состояние воспроизведения
      if (audio.paused) {
        console.log(`[AudioChannelService] Возобновление воспроизведения того же трека в том же канале: ${channelId}`);
        audio.play().catch(err => {
          console.error(`[AudioChannelService] Ошибка возобновления воспроизведения:`, err);
        });
      } else {
        console.log(`[AudioChannelService] Постановка на паузу трека в канале: ${channelId}`);
        audio.pause();
      }
      return true;
    }
    
    // Останавливаем все другие каналы перед воспроизведением нового
    const stopPromises = Array.from(this.audioElements.entries())
      .filter(([id]) => id !== channelId)
      .map(async ([id, audioEl]) => {
        if (!audioEl.paused) {
          console.log(`[AudioChannelService] Останавливаем аудио в канале ${id}`);
          audioEl.pause();
          audioEl.muted = true;
          
          // Добавляем искусственную задержку для предотвращения конфликтов
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      });

    // Дожидаемся остановки всех других каналов и добавляем дополнительную задержку
    Promise.all(stopPromises).then(() => {
      // Небольшая дополнительная задержка после остановки всех других каналов
      setTimeout(() => {
        // Запоминаем активный канал
        this.activeChannelId = channelId;
        this.activeAudio = audio;
        this.currentTrackId = track.id;
        
        // Устанавливаем URL трека
        let trackUrl = '';
        if (track.audioUrl) {
          trackUrl = track.audioUrl;
          if (audio.src !== trackUrl) {
            console.log(`[AudioChannelService] Установка URL трека: ${trackUrl}`);
            audio.src = trackUrl;
          }
        } else if (track.filename) {
          trackUrl = `/api/music/file/${track.filename}`;
          if (audio.src !== trackUrl) {
            console.log(`[AudioChannelService] Установка URL трека через filename: ${trackUrl}`);
            audio.src = trackUrl;
          }
        } else {
          console.error(`[AudioChannelService] У трека отсутствует URL или имя файла`);
          return false;
        }
        
        // Устанавливаем позицию
        if (position > 0 && position < audio.duration) {
          console.log(`[AudioChannelService] Установка позиции воспроизведения: ${position}с`);
          audio.currentTime = position;
        } else {
          console.log(`[AudioChannelService] Воспроизведение с начала трека`);
          audio.currentTime = 0;
        }
        
        // Воспроизводим
        audio.muted = false;
        
        // Запоминаем время попытки воспроизведения для защиты от конфликтов
        this.lastPlayTimestamp = Date.now();
        
        // Используем try-catch для перехвата возможных ошибок
        try {
          // Воспроизводим с использованием Promise для обработки ошибок
          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.error(`[AudioChannelService] Ошибка воспроизведения:`, err);
              
              // Проверяем, не является ли ошибка результатом прерывания play() вызовом pause()
              if (err.name === 'AbortError') {
                console.log(`[AudioChannelService] Обнаружена ошибка AbortError - воспроизведение было прервано`);
                // Не делаем повторную попытку в этом случае, так как это ожидаемое поведение
                return;
              }
              
              // Попробуем еще раз при других ошибках
              setTimeout(() => {
                audio.play().catch(err2 => {
                  console.error(`[AudioChannelService] Повторная ошибка воспроизведения:`, err2);
                });
              }, 100);
            });
          }
          return true;
        } catch (err) {
          console.error(`[AudioChannelService] Критическая ошибка воспроизведения:`, err);
          return false;
        }
      }, 50);
    });

    return true;
  }

  /**
   * Обработчик события play для предотвращения конфликтов воспроизведения
   * @param channelId ID канала, в котором произошло событие
   */
  private handleAudioPlay(channelId: string): void {
    // Если поступило событие play от не активного канала
    if (this.activeChannelId !== null && this.activeChannelId !== channelId) {
      // Проверяем, не слишком ли близко к последней команде (может быть из-за синхронизации)
      const now = Date.now();
      const timeSinceLastPlay = now - this.lastPlayTimestamp;
      
      // Если прошло менее 100мс с последней команды play, считаем это частью синхронизации
      if (timeSinceLastPlay < 100) {
        console.log(`[AudioChannelService] Игнорируем событие play от канала ${channelId} (синхронизация)`);
        return;
      }
      
      // Проверяем приоритет каналов
      const isMasterChannel = channelId === this.masterChannelId;
      const isActiveChannelMaster = this.activeChannelId === this.masterChannelId;
      
      // Если текущий активный канал - мастер, или приоритетный канал не пытается играть,
      // останавливаем воспроизведение в неактивном канале
      if (isActiveChannelMaster || !isMasterChannel) {
        const audio = this.audioElements.get(channelId);
        if (audio && !audio.paused) {
          console.log(`[AudioChannelService] Останавливаем неавторизованное воспроизведение в канале ${channelId}`);
          audio.pause();
        }
      } else if (isMasterChannel) {
        // Если канал - мастер, останавливаем текущий активный и разрешаем мастеру играть
        this.stopAllExcept(channelId);
        this.activeChannelId = channelId;
        this.activeAudio = this.audioElements.get(channelId) || null;
      }
    }
  }

  /**
   * Остановка всех аудио кроме указанного канала
   * @param exceptChannelId ID канала, который не нужно останавливать
   */
  public stopAllExcept(exceptChannelId?: string): void {
    this.audioElements.forEach((audio, channelId) => {
      if (exceptChannelId === undefined || channelId !== exceptChannelId) {
        if (!audio.paused) {
          console.log(`[AudioChannelService] Останавливаем аудио в канале ${channelId}`);
          audio.pause();
        }
        audio.muted = true;
      }
    });
  }

  /**
   * Пауза в активном канале
   * @returns Promise<boolean> - успешность операции
   */
  public async pauseActiveChannel(): Promise<boolean> {
    if (this.activeChannelId && this.activeAudio) {
      if (!this.activeAudio.paused) {
        try {
          // Устанавливаем метку времени последней операции для защиты от конфликтов
          this.lastPlayTimestamp = Date.now();
          
          console.log(`[AudioChannelService] Постановка на паузу активного канала: ${this.activeChannelId}`);
          
          return new Promise<boolean>((resolve) => {
            this.activeAudio!.pause();
            // Дожидаемся события pause для гарантии завершения операции
            const handlePause = () => {
              this.activeAudio!.removeEventListener('pause', handlePause);
              console.log(`[AudioChannelService] Пауза в канале ${this.activeChannelId} выполнена успешно`);
              resolve(true);
            };
            
            // Устанавливаем таймаут для предотвращения зависания
            const timeoutId = setTimeout(() => {
              this.activeAudio!.removeEventListener('pause', handlePause);
              console.warn(`[AudioChannelService] Таймаут при ожидании события pause в канале ${this.activeChannelId}`);
              resolve(true);
            }, 1000);
            
            this.activeAudio!.addEventListener('pause', handlePause);
          });
        } catch (err) {
          console.error(`[AudioChannelService] Ошибка при постановке на паузу:`, err);
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Получение текущего активного канала
   */
  public getActiveChannelId(): string | null {
    return this.activeChannelId;
  }

  /**
   * Проверка, является ли канал активным
   * @param channelId ID канала для проверки
   */
  public isActiveChannel(channelId: string): boolean {
    return this.activeChannelId === channelId;
  }

  /**
   * Получение текущего активного аудиоэлемента
   */
  public getActiveAudio(): HTMLAudioElement | null {
    return this.activeAudio;
  }

  /**
   * Получение ID текущего трека
   */
  public getCurrentTrackId(): number | string | null {
    return this.currentTrackId;
  }

  /**
   * Cброс состояния сервиса
   */
  public reset(): void {
    this.stopAllExcept();
    this.activeChannelId = null;
    this.activeAudio = null;
    this.currentTrackId = null;
  }

  /**
   * Проверка, зарегистрирован ли канал
   * @param channelId ID канала для проверки
   */
  public isChannelRegistered(channelId: string): boolean {
    return this.audioElements.has(channelId);
  }
  
  /**
   * Получение списка всех зарегистрированных ID каналов
   */
  public getRegisteredChannelIds(): string[] {
    return Array.from(this.audioElements.keys());
  }
  
  /**
   * Получение количества зарегистрированных каналов
   */
  public getChannelCount(): number {
    return this.audioElements.size;
  }
}

// Экспорт синглтон-экземпляра для использования во всем приложении
export const audioChannelService = AudioChannelService.getInstance();
export default audioChannelService; 