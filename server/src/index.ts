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
  origin: process.env.CLIENT_URL
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
    console.log('WebSocket инициализирован');

    // Подключаем все маршруты под /api после инициализации базы данных
    console.log('Инициализация маршрутов API...');
    const routes = await initializeRoutes()

    // Промежуточное ПО для обработки API запросов
    const apiMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.log(`[API Middleware] Processing ${req.method} ${req.originalUrl}`);
      
      // Если это базовый маршрут API
      if (req.path === '/api' || req.path === '/api/') {
        return res.json({
          message: "API ВСети",
          version: "1.0.0",
          status: "OK"
        });
      }

      // Если запрос начинается с /posts, перенаправляем его на /api/posts
      if (req.path.startsWith('/posts')) {
        const newPath = `/api${req.url}`;
        console.log(`[API Middleware] Rewriting path from ${req.url} to ${newPath}`);
        req.url = newPath;
      }

      // Удаляем префикс /api для правильной обработки маршрутов
      if (req.url.startsWith('/api/')) {
        const newPath = req.url.replace('/api', '');
        console.log(`[API Middleware] Removing /api prefix: ${req.url} -> ${newPath}`);
        req.url = newPath;
      }

      routes(req, res, next);
    };

    // Статическая раздача файлов из папки uploads
    app.use('/api/uploads', express.static(path.join(__dirname, '../uploads')))
    console.log('Статические файлы подключены');

    // Подключаем маршруты API
    app.use('/api', apiMiddleware);
    app.use('/posts', apiMiddleware);

    // Обработчик для несуществующих маршрутов
    app.use((req, res) => {
      console.log(`[404] Маршрут не найден: ${req.method} ${req.originalUrl}`);
      res.status(404).json({ 
        error: 'Маршрут не найден',
        method: req.method,
        url: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl
      });
    });

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