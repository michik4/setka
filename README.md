# Сетка - Социальная сеть

Социальная сеть с возможностью публикации постов, обмена фотографиями и общения между пользователями.

## Структура проекта

- `/client` - Frontend часть приложения (React + TypeScript)
- `/server` - Backend часть приложения (Node.js + Express + TypeScript)

## Основные возможности

- Регистрация и авторизация пользователей
- Создание и редактирование профиля
- Публикация текстовых постов с возможностью прикрепить
  - фото/фото альбом
  - музыку/музыкальный альбом
- Загрузка и управление фотографиями
- Стена пользователя
- Лента новостей
- Лайки, комментарии.

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
git clone https://github.com/michik4/setka.git
cd setka
```

### если версия разработки

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

### если продакшен версия 

2. установить зависимости в обеих частях проекта 
```bash
cd /server && npm i
cd ../client && npm i
```

3. установить .env файлы обоих приложений
```bash
nano /server/.env
nano /client/.env
```
>server
```env
PORT=${SERVER_PORT}
HOST=${SERVER_HOST}

CLIENT_URL=http://${CLIENT_HOST}:${CLIENT_PORT}

DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=30d
UPLOAD_DIR=uploads
```
>client

```env
REACT_APP_API_URL=http://${SERVER_HOST}:${SERVER_PORT}/api
REACT_APP_WS_URL=http://${SERVER_HOST}:${SERVER_PORT}
REACT_APP_MEDIA_URL=http://${SERVER_HOST}:${SERVER_PORT}/api/media
```

1. скомпилировать build версии обоих приложений 
```bash
cd ../server && npm run build
cd ../client && npm run build
```
1. перенести статические файлы собранного клиента для раздачи сервеным приложением 
```bash
#>client dir
mv /
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
