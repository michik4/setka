// Файл для изменения настроек CORS на сервере
// Откройте файл server/src/index.ts и найдите блок настройки CORS
// Замените настройки CORS на следующие:

app.use(cors({
  origin: function(origin, callback) {
    // Разрешаем запросы от всех источников (в production это небезопасно)
    // В идеале лучше перечислить конкретные домены
    const allowedOrigins = [
      'http://83.217.221.213:3000',  // домен вашего сервера
      'http://localhost:3000',       // локальный домен для разработки
      'http://localhost:3001'        // локальный домен с другим портом
    ];
    
    // Для запросов без origin (например, при прямом доступе к API)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie', 'Set-Cookie'],
  exposedHeaders: ['Set-Cookie']
}))

// Также добавьте настройку для куки
// Найдите обработчик аутентификации и убедитесь, что куки устанавливаются с правильными параметрами:

res.cookie('auth_token', token, {
  httpOnly: true,
  secure: false, // Установите true, если используете HTTPS
  sameSite: 'lax', // Используйте 'none' если у вас разные домены, но требуется secure: true
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
}); 