// Упрощенная настройка CORS для отладки
// Замените блок настройки CORS в файле server/src/index.ts

app.use(cors({
  origin: true, // Разрешаем запросы с любых доменов (только для отладки!)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Cookie', 'Set-Cookie'],
  exposedHeaders: ['Set-Cookie']
}))

// Также проверьте настройки cookie в обработчике авторизации:
// Найдите res.cookie и установите следующие параметры:

res.cookie('auth_token', token, {
  httpOnly: true,
  secure: false, // Установите true, если используете HTTPS
  sameSite: 'none',  // Важно для доступа с разных доменов
  domain: '83.217.221.213', // IP вашего сервера
  maxAge: 30 * 24 * 60 * 60 * 1000 // 30 дней
}); 