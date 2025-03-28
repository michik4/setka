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

    // Настройка статических файлов
    const uploadsPath = path.join(__dirname, '..', 'uploads')
    app.use('/api/uploads', express.static(uploadsPath))
    app.use('/uploads', express.static(uploadsPath)) // оставляем для обратной совместимости
    app.use('/api/photos', express.static(path.join(uploadsPath, 'photos')))
    app.use('/api/temp', express.static(path.join(uploadsPath, 'temp'))) // добавляем роутинг для временных файлов
    console.log('Настроена раздача статических файлов из:', uploadsPath)

    // Инициализация маршрутов
    console.log('Инициализируем маршруты...');
    initializeRoutes(app)
    console.log('Маршруты инициализированы')

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