# Сетка - Социальная сеть

Социальная сеть с возможностью публикации постов, обмена фотографиями и общения между пользователями.

## Структура проекта

- `/client` - Frontend часть приложения (React + TypeScript)
- `/server` - Backend часть приложения (Node.js + Express + TypeScript)

## Основные возможности

- Регистрация и авторизация пользователей
- Создание и редактирование профиля
- Публикация постов с текстом и фотографиями
- Загрузка и управление фотографиями
- Стена пользователя
- Лента новостей
- Лайки, комментарии и репосты (пока не работают)))

## Требования

### Для клиента
- Node.js 16+
- npm или yarn

### Для сервера
- Node.js 16+
- PostgreSQL 12+
- npm или yarn

## Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone [url репозитория]
cd setka
```

2. Установите зависимости и запустите сервер:
```bash
cd server
npm install
npm run dev
```

3. В отдельном терминале установите зависимости и запустите клиент:
```bash
cd client
npm install
npm start
```

## Конфигурация проекта

### Переменные окружения

#### Клиент (.env)
```
REACT_APP_API_URL=http://localhost:3001
REACT_APP_UPLOAD_URL=http://localhost:3001/uploads
REACT_APP_MAX_FILE_SIZE=5242880
```

#### Сервер (.env)
```
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=setka
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=30d
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

## Структура базы данных

```
┌─────────────┐     ┌─────────────┐
│    User     │     │    Post     │
├─────────────┤     ├─────────────┤
│ id          │     │ id          │
│ username    │     │ content     │
│ email       │     │ userId      │
│ password    │     │ createdAt   │
│ avatar      │     │ updatedAt   │
│ status      │     └──────┬──────┘
│ createdAt   │            │
└──────┬──────┘            │
       │                   │
       │     ┌─────────────┐
       └─────┤   Photo     │
             ├─────────────┤
             │ id          │
             │ filename    │
             │ userId      │
             │ postId      │
             │ createdAt   │
             └─────────────┘
```

## Решение проблем

### Клиент
- **CORS ошибки**: Убедитесь, что сервер настроен с правильными CORS заголовками
- **404 для изображений**: Проверьте правильность пути REACT_APP_UPLOAD_URL в .env
- **Авторизация**: Проверьте, что куки сохраняются и отправляются с запросами

### Сервер
- **Ошибки подключения к БД**: Проверьте настройки подключения в .env
- **Ошибки загрузки файлов**: Убедитесь, что директория uploads существует и доступна для записи
- **JWT ошибки**: Проверьте срок действия токена и секретный ключ

## Технологии

### Frontend
- React
- TypeScript
- React Router
- CSS Modules
- Fetch API

### Backend
- Node.js
- Express
- TypeScript
- TypeORM
- PostgreSQL
- JWT для аутентификации

## Разработка

### Структура веток
- `main` - основная ветка
- `develop` - ветка разработки
- `feature/*` - ветки для новых функций
- `bugfix/*` - ветки для исправления ошибок

### Стиль кода
- Проект следует принципам TypeScript
- Используется ESLint для проверки кода
- Prettier для форматирования

## Лицензия

MIT 
