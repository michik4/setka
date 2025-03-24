import express from 'express'
import { createServer } from 'http'
import cors from 'cors'
import dotenv from 'dotenv'
import cookieParser from 'cookie-parser'
import { AppDataSource } from './db/db_connect'
import { initializeRoutes } from './routes/routes'
import { WebSocketService } from './services/WebSocket.service'
import path from 'path'

dotenv.config()
console.log('Загружены переменные окружения');

const app = express()
const server = createServer(app)

// Middleware
app.use(cors({
  credentials: true,
  origin: process.env.CLIENT_URL || 'http://localhost:3001'
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
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).send('Что-то пошло не так!')
})

const startServer = async () => {
  try {
    console.log('Начинаем подключение к базе данных...');
    // Подключение к базе данных
    await AppDataSource.initialize()
    console.log('Подключено к PostgreSQL')

    console.log('Инициализируем WebSocket...');
    // Инициализация WebSocket
    const wsService = new WebSocketService(server)
    console.log('WebSocket инициализирован')

    // Настройка статических файлов
    const uploadsPath = path.join(__dirname, '..', 'uploads')
    app.use('/api/uploads', express.static(uploadsPath))
    app.use('/uploads', express.static(uploadsPath)) // оставляем для обратной совместимости
    console.log('Настроена раздача статических файлов из:', uploadsPath)

    // Инициализация маршрутов
    console.log('Инициализируем маршруты...');
    initializeRoutes(app)
    console.log('Маршруты инициализированы')

    const PORT = process.env.PORT || 3000
    server.listen(PORT, () => {
      console.log(`Сервер запущен на порту ${PORT}`)
    })
  } catch (error) {
    console.error('Ошибка при запуске сервера:', error)
    process.exit(1)
  }
}

startServer() 