/**
 * Менеджер для работы с BroadcastChannel API
 * Обеспечивает стабильную связь между вкладками/окнами через BroadcastChannel
 */
export class BroadcastChannelManager {
    private channel: BroadcastChannel | null = null;
    private channelName: string;
    private messageCallback: ((event: MessageEvent) => void) | null = null;
    private checkInterval: NodeJS.Timeout | null = null;
    private isActive: boolean = false;
    
    /**
     * Создает экземпляр менеджера каналов
     * @param channelName Имя канала для коммуникации
     */
    constructor(channelName: string) {
        this.channelName = channelName;
        this.isActive = false;
    }
    
    /**
     * Инициализация канала и настройка обработчиков
     * @param messageCallback Функция обратного вызова для обработки входящих сообщений
     */
    init(messageCallback: (event: MessageEvent) => void): boolean {
        this.messageCallback = messageCallback;
        this.isActive = true;
        
        // Создаем канал
        const success = this.createChannel();
        
        // Настраиваем периодическую проверку состояния канала
        this.checkInterval = setInterval(() => {
            if (this.isActive && (!this.channel || this.channel.name !== this.channelName)) {
                console.log('[BroadcastManager] Канал недоступен, пересоздаем...');
                this.createChannel();
            }
        }, 3000);
        
        return success;
    }
    
    /**
     * Создает и настраивает новый канал
     * @returns true, если канал успешно создан, иначе false
     */
    private createChannel(): boolean {
        try {
            // Закрываем существующий канал, если он есть
            this.closeChannel();
            
            // Создаем новый канал
            this.channel = new BroadcastChannel(this.channelName);
            
            // Добавляем обработчик сообщений
            if (this.messageCallback) {
                this.channel.addEventListener('message', this.messageCallback);
            }
            
            console.log('[BroadcastManager] Канал успешно создан:', this.channelName);
            return true;
        } catch (error) {
            console.error('[BroadcastManager] Ошибка при создании канала:', error);
            this.channel = null;
            return false;
        }
    }
    
    /**
     * Безопасно закрывает текущий канал
     */
    private closeChannel(): void {
        if (this.channel) {
            try {
                if (this.messageCallback) {
                    this.channel.removeEventListener('message', this.messageCallback);
                }
                this.channel.close();
                this.channel = null;
            } catch (error) {
                console.error('[BroadcastManager] Ошибка при закрытии канала:', error);
                this.channel = null;
            }
        }
    }
    
    /**
     * Отправляет сообщение через канал
     * @param message Объект сообщения для отправки
     * @returns true, если сообщение успешно отправлено, иначе false
     */
    postMessage(message: any): boolean {
        try {
            // Если канал отсутствует или закрыт, пытаемся создать новый
            if (!this.channel || this.channel.name !== this.channelName) {
                if (!this.createChannel()) {
                    return false;
                }
            }
            
            // Отправляем сообщение, проверяя null
            if (this.channel) {
                this.channel.postMessage(message);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[BroadcastManager] Ошибка при отправке сообщения:', error);
            
            // Если произошла ошибка, пытаемся пересоздать канал и отправить еще раз
            setTimeout(() => {
                try {
                    if (this.createChannel() && this.channel) {
                        this.channel.postMessage(message);
                    }
                } catch (retryError) {
                    console.error('[BroadcastManager] Повторная отправка не удалась:', retryError);
                }
            }, 100);
            
            return false;
        }
    }
    
    /**
     * Отключает канал и останавливает все процессы
     */
    disconnect(): void {
        this.isActive = false;
        
        // Останавливаем интервал проверки
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        // Закрываем канал
        this.closeChannel();
        
        console.log('[BroadcastManager] Канал отключен:', this.channelName);
    }
} 