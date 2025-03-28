import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { AppDataSource } from './db/db_connect'
import { initializeRoutes } from './routes/routes'
import { WebSocketService } from './services/WebSocket.service'
import path from 'path'
import { config } from './config'
import fs from 'fs'

dotenv.config()
console.log('Загружены переменные окружения');

const app = express()
const server = createServer(app)

// Middleware
app.use(cors({
  origin: config.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie', 'Set-Cookie'],
  exposedHeaders: ['Set-Cookie']
}))
app.use(express.json())
app.use(cookieParser())

// Добавляем логирование всех запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Base URL:', req.baseUrl);
  console.log('Original URL:', req.originalUrl);
  next();
});

console.log('Настроены middleware');

// Обработка ошибок
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Ошибка:', err);
  res.status(500).json({ message: 'Внутренняя ошибка сервера' });
})

const startServer = async () => {
  try {
    console.log('Начинаем подключение к базе данных...');
    // Подключение к базе данных
    await AppDataSource.initialize()
    console.log('Подключено к PostgreSQL')

    console.log('Инициализируем WebSocket...');
    // Инициализация WebSocket
    const wsService = new WebSocketService(server);
    console.log('WebSocket инициализирован')

    // Инициализация маршрутов API
    console.log('Инициализируем маршруты API...');
    initializeRoutes(app)
    console.log('Маршруты API инициализированы')

    // Настройка статических файлов (должно быть после инициализации API-маршрутов)
    const uploadsPath = path.join(__dirname, '..', 'uploads')
    
    // Функция для добавления CORS заголовков
    const addCorsHeaders = (res: express.Response, path: string, stat: any) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        
        // Для аудиофайлов установим правильный MIME тип
        if (path.endsWith('.mp3')) {
            res.set('Content-Type', 'audio/mpeg');
        } else if (path.endsWith('.wav') || path.endsWith('.wave')) {
            res.set('Content-Type', 'audio/wav');
        } else if (path.endsWith('.ogg')) {
            res.set('Content-Type', 'audio/ogg');
        }
    };
    
    // Опции для статических файлов
    const staticOptions = {
        setHeaders: addCorsHeaders
    };
    
    // ВАЖНО: Сначала настраиваем маршрут для аудиофайлов, затем общие статические маршруты
    // Отдельный обработчик для аудиофайлов реализован в контроллере /api/music/file/:filename
    console.log('Настроен специальный обработчик для аудиофайлов через контроллер: /api/music/file/:filename');
    
    // Затем настраиваем остальные статические пути
    app.use('/uploads', express.static(uploadsPath, staticOptions)); // оставляем для обратной совместимости
    app.use('/api/uploads', express.static(uploadsPath, staticOptions));
    app.use('/api/photos', express.static(path.join(uploadsPath, 'photos'), staticOptions));
    app.use('/api/temp', express.static(path.join(uploadsPath, 'temp'), staticOptions));
    
    // Статический маршрут для музыки как запасной вариант для обратной совместимости
    app.use('/api/media/music', express.static(path.join(uploadsPath, 'music'), staticOptions));
    
    console.log('Настроена раздача статических файлов из:', uploadsPath);

    const PORT = process.env.PORT || 3000
    server.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`)
      console.log(`WebSocket сервер доступен на ws://localhost:${PORT}`)
      console.log(`REST API доступен на http://localhost:${PORT}`)
      console.log(`CORS разрешен для ${config.CLIENT_URL}`)
    })
  } catch (error) {
    console.error('Ошибка при запуске сервера:', error)
    process.exit(1)
  }
}

startServer() 