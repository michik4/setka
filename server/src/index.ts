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
  console.log('\n======================================================================');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Base URL:', req.baseUrl);
  console.log('Original URL:', req.originalUrl);
  
  // Логируем body для запросов, которые его содержат
  if (req.method !== 'GET' && req.body) {
    console.log('Request Body:', JSON.stringify(req.body, null, 2));
    
    // Проверяем содержимое полей, связанных с треками
    if (req.body.trackIds) {
      console.log('TrackIds в запросе:', req.body.trackIds, typeof req.body.trackIds);
      if (typeof req.body.trackIds === 'string') {
        try {
          const parsed = JSON.parse(req.body.trackIds);
          console.log('Распарсенные trackIds:', parsed);
        } catch (e) {
          console.log('Не удалось распарсить trackIds');
        }
      }
    }
    
    if (req.body.trackId) {
      console.log('TrackId в запросе:', req.body.trackId, typeof req.body.trackId);
    }
  }
  
  // Перехватываем метод send для логирования ответов
  const originalSend = res.send;
  res.send = function(body) {
    console.log(`[RESPONSE] Status: ${res.statusCode}`);
    
    // Логируем тело ответа, только если это не успешный ответ (чтобы не логировать большие данные)
    if (res.statusCode < 200 || res.statusCode >= 400) {
      try {
        console.log('Response Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
      } catch (e) {
        console.log('Response Body: [Cannot stringify]');
      }
    }
    
    console.log('======================================================================\n');
    return originalSend.call(this, body);
  };
  
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

    // Настраиваем отдачу React-приложения из папки public
    const publicPath = path.join(__dirname, '..', 'public');
    console.log('Настраиваем отдачу React-приложения из:', publicPath);
    
    // Проверяем, существует ли папка
    if (fs.existsSync(publicPath)) {
      console.log('Папка public существует, настраиваем статические маршруты');
      
      // Статические файлы из папки public
      app.use(express.static(publicPath));
      
      // Все остальные GET запросы не к API направляем на index.html
      app.get('*', (req, res, next) => {
        // Исключаем запросы к API
        if (!req.path.startsWith('/api/')) {
          console.log(`[SPA] Запрос к ${req.path} направлен на index.html`);
          res.sendFile(path.join(publicPath, 'index.html'));
        } else {
          next();
        }
      });
    } else {
      console.warn('Папка public не существует! React-приложение не будет доступно. Создайте папку и скопируйте туда файлы сборки.');
    }

    const PORT = process.env.PORT || 3000
    // Изменяем адрес с умолчания на 0.0.0.0 (все IP)
    const HOST = config.HOST
    server.listen(Number(PORT), HOST, () => {
      console.log(`Сервер запущен на ${HOST}:${PORT}`)
      console.log(`WebSocket сервер доступен на ws://${HOST === '0.0.0.0' ? 'IP-адрес-сервера' : HOST}:${PORT}`)
      console.log(`REST API доступен на http://${HOST === '0.0.0.0' ? 'IP-адрес-сервера' : HOST}:${PORT}`)
      console.log(`CORS разрешен для ${config.CLIENT_URL}`)
    })
  } catch (error) {
    console.error('Ошибка при запуске сервера:', error)
    process.exit(1)
  }
}

startServer() 