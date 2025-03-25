# Сетка - Backend

Backend часть социальной сети Сетка, построенная на Node.js, Express и TypeScript.

## Структура проекта

```
src/
├── controllers/    # Контроллеры для обработки запросов
├── db/            # Конфигурация базы данных и миграции
├── entities/      # TypeORM сущности
├── middlewares/   # Промежуточные обработчики
├── routes/        # Маршруты API
├── services/      # Бизнес-логика
├── types/         # TypeScript типы и интерфейсы
└── utils/         # Вспомогательные функции
```

## API Endpoints

### Аутентификация
- `POST /auth/register` - регистрация
- `POST /auth/login` - вход
- `POST /auth/logout` - выход
- `GET /auth/me` - информация о текущем пользователе

### Пользователи
- `GET /users/:id` - получение информации о пользователе
- `PUT /users/:id` - обновление профиля
- `POST /users/:id/avatar` - загрузка аватара
- `PUT /users/:id/status` - обновление статуса

### Посты
- `GET /posts` - получение ленты постов
- `POST /posts` - создание поста
- `PUT /posts/:id` - редактирование поста
- `DELETE /posts/:id` - удаление поста

### Стена
- `GET /wall/:userId` - получение постов со стены
- `POST /wall` - создание поста на стене
- `PUT /wall/:id` - редактирование поста на стене
- `DELETE /wall/:id` - удаление поста со стены

### Фотографии
- `POST /photos` - загрузка фотографии
- `GET /photos/:id` - получение фотографии
- `DELETE /photos/:id` - удаление фотографии
- `DELETE /photos/:photoId/posts/:postId` - отвязка фото от поста

## База данных

### Основные сущности
- User (пользователи)
- Post (посты)
- WallPost (посты на стене)
- Photo (фотографии)
- Session (сессии)

### Миграции
Миграции находятся в папке `src/db/migrations` и управляются через TypeORM.

## Разработка

### Установка и запуск

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка
npm run build

# Запуск в продакшене
npm start
```

### База данных

```bash
# Создание миграции
npm run migration:create

# Запуск миграций
npm run migration:run

# Откат миграций
npm run migration:revert
```

### Переменные окружения

Создайте файл `.env` в корне проекта:

```env
# Сервер
PORT=3001
NODE_ENV=development

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_NAME=setka
DB_USER=postgres
DB_PASSWORD=postgres

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d

# Загрузка файлов
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880 # 5MB
```

## Зависимости

Основные:
- express
- typescript
- typeorm
- pg
- jsonwebtoken
- multer
- cors
- cookie-parser

Разработка:
- @types/express
- @types/node
- ts-node
- nodemon
- eslint
- prettier