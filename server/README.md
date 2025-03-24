# ВСети - Серверная часть

Серверная часть социальной сети "ВСети", реализованная с использованием Node.js, Express, TypeScript и PostgreSQL.

> Потом нормальную документацию в виде html сделаю

## Технологии

- Node.js
- Express
- TypeScript
- PostgreSQL
- TypeORM
- Socket.IO
- WebSocket

## Требования

- Node.js >= 14
- PostgreSQL >= 12
- npm или yarn

## Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/VkClone.git
cd VkClone/server
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` в корневой директории сервера и настройте переменные окружения:
```env
# Окружение
NODE_ENV=development

# Сервер
PORT=3000
CLIENT_URL=http://localhost:3000

# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_NAME=vkclone
```

4. Запустите сервер в режиме разработки:
```bash
npm run dev
```

## Структура проекта

```
server/
├── src/
│   ├── controllers/     # Контроллеры
│   ├── entities/        # Сущности базы данных
│   ├── routes/          # Маршруты API
│   ├── services/        # Сервисы
│   ├── db/             # Конфигурация базы данных
│   └── index.ts        # Точка входа
├── .env                # Переменные окружения
├── package.json        # Зависимости и скрипты
└── tsconfig.json       # Конфигурация TypeScript
```

## API Endpoints

### Пользователи

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/users` | Получение всех пользователей |
| GET | `/api/users/email/:email` | Получение пользователя по email |
| POST | `/api/users` | Создание пользователя |
| POST | `/api/users/random` | Создание случайного пользователя |
| PUT | `/api/users/:id` | Обновление пользователя |
| DELETE | `/api/users/:id` | Удаление пользователя |

#### Пример создания пользователя:
```json
POST /api/users
{
    "firstName": "Иван",
    "lastName": "Иванов",
    "email": "ivan@example.com",
    "password": "password123"
}
```

### Чаты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/chats` | Получение всех чатов |
| GET | `/api/chats/:id` | Получение чата по ID |
| GET | `/api/chats/user/:userId` | Получение чатов пользователя |
| POST | `/api/chats` | Создание чата |
| POST | `/api/chats/:chatId/messages` | Отправка сообщения |
| DELETE | `/api/chats/:id` | Удаление чата |

#### Пример создания чата:
```json
POST /api/chats
{
    "type": "private",
    "participantIds": [1, 2]
}
```

#### Пример отправки сообщения:
```json
POST /api/chats/1/messages
{
    "senderId": 1,
    "content": "Привет! Как дела?"
}
```

### Фотографии

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/photos` | Загрузка фотографии |
| GET | `/api/photos/:id` | Получение фотографии по ID |
| GET | `/api/photos/user/:userId` | Получение фотографий пользователя |
| DELETE | `/api/photos/:id` | Удаление фотографии |

#### Пример получения фотографии по ID:
```bash
GET /api/photos/1

Ответ:
{
    "id": 1,
    "filename": "1711073000000-123456789.jpg",
    "originalName": "my-photo.jpg",
    "mimetype": "image/jpeg",
    "size": 1024567,
    "path": "uploads/photos/1711073000000-123456789.jpg",
    "userId": 1,
    "description": "Моя фотография",
    "createdAt": "2024-03-22T10:30:00.000Z",
    "user": {
        "id": 1,
        "firstName": "Иван",
        "lastName": "Иванов",
        // ... другие поля пользователя
    }
}
```

#### Пример загрузки фотографии:
```bash
# Используя curl
curl -X POST \
  -F "photo=@path/to/photo.jpg" \
  -F "userId=1" \
  -F "description=Моя фотография" \
  http://localhost:3000/api/photos

# Используя HTML форму
<form method="post" enctype="multipart/form-data" action="/api/photos">
  <input type="file" name="photo" accept="image/jpeg,image/png,image/gif">
  <input type="hidden" name="userId" value="1">
  <input type="text" name="description" placeholder="Описание">
  <button type="submit">Загрузить</button>
</form>
```

Ограничения для фотографий:
- Максимальный размер: 5MB
- Поддерживаемые форматы: JPEG, PNG, GIF
- Файлы сохраняются в директории: `uploads/photos`

### Посты

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/posts` | Получение всех постов |
| GET | `/api/posts/:id` | Получение поста по ID |
| GET | `/api/posts/user/:userId` | Получение постов пользователя |
| POST | `/api/posts` | Создание поста |
| PUT | `/api/posts/:id` | Обновление поста |
| DELETE | `/api/posts/:id` | Удаление поста |

#### Структура поста:
```typescript
interface Post {
    id: number;              // ID поста
    content: string;         // Текст поста
    authorId: number;        // ID автора
    author: User;           // Объект автора
    photos: Photo[];        // Массив прикрепленных фотографий
    likesCount: number;     // Количество лайков
    commentsCount: number;  // Количество комментариев
    sharesCount: number;    // Количество репостов
    createdAt: Date;       // Дата создания
    updatedAt: Date;       // Дата обновления
}
```

#### Примеры запросов:

1. Получение всех постов:
```bash
GET /api/posts

Ответ:
[
    {
        "id": 1,
        "content": "Привет, мир!",
        "authorId": 1,
        "author": {
            "id": 1,
            "firstName": "Иван",
            "lastName": "Иванов"
        },
        "photos": [
            {
                "id": 1,
                "filename": "photo1.jpg",
                "path": "/uploads/photos/photo1.jpg"
            }
        ],
        "likesCount": 5,
        "commentsCount": 2,
        "sharesCount": 1,
        "createdAt": "2024-03-22T10:30:00.000Z",
        "updatedAt": "2024-03-22T10:30:00.000Z"
    }
]
```

2. Создание нового поста:
```bash
POST /api/posts
Content-Type: application/json

{
    "content": "Мой новый пост!",
    "authorId": 1,
    "photoIds": [1, 2]  // ID прикрепляемых фотографий
}

Ответ (201 Created):
{
    "id": 2,
    "content": "Мой новый пост!",
    "authorId": 1,
    "author": {
        "id": 1,
        "firstName": "Иван",
        "lastName": "Иванов"
    },
    "photos": [
        {
            "id": 1,
            "filename": "photo1.jpg",
            "path": "/uploads/photos/photo1.jpg"
        },
        {
            "id": 2,
            "filename": "photo2.jpg",
            "path": "/uploads/photos/photo2.jpg"
        }
    ],
    "likesCount": 0,
    "commentsCount": 0,
    "sharesCount": 0,
    "createdAt": "2024-03-22T11:00:00.000Z",
    "updatedAt": "2024-03-22T11:00:00.000Z"
}
```

3. Обновление поста:
```bash
PUT /api/posts/2
Content-Type: application/json

{
    "content": "Обновленный текст поста",
    "photoIds": [3]  // Новый список фотографий
}

Ответ:
{
    "id": 2,
    "content": "Обновленный текст поста",
    "authorId": 1,
    "photos": [
        {
            "id": 3,
            "filename": "photo3.jpg",
            "path": "/uploads/photos/photo3.jpg"
        }
    ],
    // ... остальные поля
}
```

4. Получение постов пользователя:
```bash
GET /api/posts/user/1

Ответ:
[
    {
        "id": 1,
        "content": "Первый пост",
        "authorId": 1,
        // ... остальные поля
    },
    {
        "id": 2,
        "content": "Второй пост",
        "authorId": 1,
        // ... остальные поля
    }
]
```

#### Коды ответов:

| Код | Описание |
|-----|----------|
| 200 | Успешное выполнение запроса |
| 201 | Пост успешно создан |
| 204 | Пост успешно удален |
| 404 | Пост не найден |
| 500 | Ошибка сервера |

#### Особенности и ограничения:
- Посты сортируются по дате создания (сначала новые)
- При получении постов автоматически подгружаются связанные данные (автор и фотографии)
- При создании поста можно прикрепить существующие фотографии через массив `photoIds`
- При обновлении поста список фотографий полностью заменяется на новый
- При удалении поста связанные фотографии не удаляются

## WebSocket События

| Событие | Направление | Данные | Описание |
|---------|-------------|---------|-----------|
| auth | Client → Server | `userId` | Аутентификация |
| join_chat | Client → Server | `chatId` | Присоединение к чату |
| new_message | Client → Server | `{ chatId, message }` | Отправка сообщения |
| message_received | Server → Client | `message` | Получение сообщения |
| typing | Client → Server | `{ chatId, userId }` | Печатает |
| user_typing | Server → Client | `userId` | Уведомление о печати |

### Пример использования WebSocket:
```javascript
// Подключение к WebSocket
const socket = io('http://localhost:3000');

// Аутентификация
socket.emit('auth', userId);

// Присоединение к чату
socket.emit('join_chat', chatId);

// Отправка сообщения
socket.emit('new_message', {
    chatId: 1,
    message: {
        content: 'Привет!',
        senderId: 1
    }
});

// Получение сообщения
socket.on('message_received', (message) => {
    console.log('Новое сообщение:', message);
});
```

## Скрипты

- `npm run dev` - Запуск сервера в режиме разработки
- `npm run build` - Сборка проекта
- `npm start` - Запуск собранного проекта
- `npm test` - Запуск тестов

## Тестирование

### Запуск тестов

```bash
# Запуск всех тестов
npm test

# Запуск тестов с отчетом о покрытии
npm run test:coverage

# Запуск тестов в режиме watch
npm run test:watch
```

### Структура тестов

Тесты находятся в директории `src/tests/` и включают:

- `auth.controller.test.ts` - тесты авторизации и управления сессиями
  - Авторизация пользователя
  - Выход из системы
  - Управление сессиями
  - Покрытие: 79.54%

- `user.controller.test.ts` - тесты управления пользователями
  - Создание пользователя
  - Получение списка пользователей
  - Обновление данных пользователя
  - Удаление пользователя
  - Покрытие: 84.37%

- `chat.controller.test.ts` - тесты чатов и сообщений
  - Создание чатов
  - Получение списка чатов
  - Отправка сообщений
  - Управление участниками
  - Покрытие: 85%

- `photo.controller.test.ts` - тесты управления фотографиями
  - Загрузка фотографий
  - Получение фотографий пользователя
  - Удаление фотографий
  - Обработка ошибок
  - Покрытие: 82.5%

### Покрытие кода

![image](https://github.com/user-attachments/assets/1f765d24-e96e-47ae-9634-69dc583e6b73)

- Общее покрытие: 71.83%
- Покрытие контроллеров: 83.08%
- Покрытие сущностей: 87.03%

Области, требующие улучшения покрытия:
- Сервисы (services): 20.93%
- База данных (db): 58.33%

## База данных

### Основные таблицы:

1. `users` - Пользователи
2. `chats` - Чаты
3. `messages` - Сообщения
4. `users_chats` - Связь пользователей и чатов

## Разработка

1. Создайте ветку для новой функциональности:
```bash
git checkout -b feature/name
```

2. Внесите изменения и создайте коммит:
```bash
git add .
git commit -m "feat: description"
```

3. Отправьте изменения и создайте Pull Request:
```bash
git push origin feature/name
```

## Лицензия

MIT 
