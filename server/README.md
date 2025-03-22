# ВСети - Серверная часть

Серверная часть социальной сети "ВСети", реализованная с использованием Node.js, Express, TypeScript и PostgreSQL.

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

### Покрытие кода

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