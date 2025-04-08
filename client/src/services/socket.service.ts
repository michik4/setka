import { io, Socket, ManagerOptions, SocketOptions } from 'socket.io-client';

// Логируем все переменные окружения для отладки
console.log('Переменные окружения:', {
    WS_URL: process.env.REACT_APP_WS_URL,
    NODE_ENV: process.env.NODE_ENV,
    PUBLIC_URL: process.env.PUBLIC_URL
});

// Используем значение по умолчанию, если переменная окружения не определена
const WS_URL = process.env.REACT_APP_WS_URL || 'https://rich-socks-dance.loca.lt';

class SocketService {
    private socket: Socket | null = null;
    private static instance: SocketService;
    private isConnecting: boolean = false;
    private connectionPromise: Promise<Socket> | null = null;
    private readonly MAX_RECONNECT_ATTEMPTS = 3;
    private reconnectAttempts = 0;

    constructor() {
        console.log('Initializing SocketService');
        console.log('Using WebSocket URL:', WS_URL);
    }

    static getInstance(): SocketService {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }

    public async connectAndWait(): Promise<Socket> {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return this.socket;
        }

        if (this.connectionPromise) {
            console.log('Connection already in progress');
            return this.connectionPromise;
        }

        this.reconnectAttempts = 0;
        console.log('Starting new connection attempt');
        
        this.connectionPromise = new Promise<Socket>((resolve, reject) => {
            try {
                this.socket = io(WS_URL, {
                    transports: ['websocket'],
                    reconnection: true,
                    reconnectionAttempts: this.MAX_RECONNECT_ATTEMPTS,
                });

                this.socket.on('connect', () => {
                    console.log('Socket connected successfully');
                    this.reconnectAttempts = 0;
                    resolve(this.socket as Socket);
                });

                this.socket.on('connect_error', (error) => {
                    this.reconnectAttempts++;
                    console.error(`Socket connection error (attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}):`, error);
                    
                    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
                        reject(error);
                    }
                });
            } catch (error) {
                console.error('Error during socket initialization:', error);
                reject(error);
            }
        });

        return this.connectionPromise;
    }

    private handleConnectionFailure(error: Error): void {
        console.error('Ошибка при подключении:', error);
        this.isConnecting = false;
        this.reconnectAttempts++;

        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }

        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            console.log('Планирование следующей попытки подключения...');
            setTimeout(() => {
                this.connectAndWait().catch(console.error);
            }, 2000);
        }
    }

    // Этот метод оставляем для обратной совместимости
    connect(): Socket | null {
        if (!this.socket) {
            this.connectAndWait().catch(error => {
                console.error('Ошибка при подключении:', error);
            });
        }
        return this.socket;
    }

    async authenticate(userId: number): Promise<void> {
        try {
            const socket = await this.connectAndWait();
            
            // Проверяем, не аутентифицирован ли уже сокет
            if (socket.auth && socket.connected) {
                console.log('Сокет уже аутентифицирован');
                return;
            }
            
            console.log('Отправляем запрос на аутентификацию для пользователя:', userId);
            socket.emit('auth', userId);
        } catch (error) {
            console.error('Ошибка при аутентификации:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnecting = false;
        this.connectionPromise = null;
    }

    async getSocket(): Promise<Socket> {
        return this.connectAndWait();
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export const socketService = SocketService.getInstance(); 