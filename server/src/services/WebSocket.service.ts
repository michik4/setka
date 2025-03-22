import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';

export class WebSocketService {
  private io: Server;
  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        methods: ['GET', 'POST']
      }
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('Новое подключение:', socket.id);

      // Аутентификация пользователя
      socket.on('auth', (userId: string) => {
        this.userSockets.set(userId, socket.id);
        socket.join(`user_${userId}`);
        console.log(`Пользователь ${userId} аутентифицирован`);
      });

      // Присоединение к чату
      socket.on('join_chat', (chatId: string) => {
        socket.join(`chat_${chatId}`);
        console.log(`Сокет ${socket.id} присоединился к чату ${chatId}`);
      });

      // Обработка нового сообщения
      socket.on('new_message', (data: {
        chatId: string;
        message: {
          sender: number;
          content: string;
          timestamp: Date;
        }
      }) => {
        this.io.to(`chat_${data.chatId}`).emit('message_received', data.message);
      });

      // Печатает
      socket.on('typing', (data: { chatId: string; userId: string }) => {
        socket.to(`chat_${data.chatId}`).emit('user_typing', data.userId);
      });

      // Отключение
      socket.on('disconnect', () => {
        const userId = this.findUserIdBySocketId(socket.id);
        if (userId) {
          this.userSockets.delete(userId);
        }
        console.log('Клиент отключился:', socket.id);
      });
    });
  }

  private findUserIdBySocketId(socketId: string): string | undefined {
    for (const [userId, sid] of this.userSockets.entries()) {
      if (sid === socketId) return userId;
    }
    return undefined;
  }

  // Метод для отправки уведомления конкретному пользователю
  public sendNotification(userId: string, notification: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }
} 