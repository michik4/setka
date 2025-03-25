# Сетка - Frontend

Frontend часть социальной сети Сетка, построенная на React и TypeScript.

## Структура проекта

```
src/
├── components/     # React компоненты
├── contexts/       # React контексты (авторизация и т.д.)
├── hooks/         # Пользовательские хуки
├── pages/         # Компоненты страниц
├── types/         # TypeScript типы и интерфейсы
├── utils/         # Вспомогательные функции
└── config.ts      # Конфигурация приложения
```

## Основные компоненты

### Аутентификация
- `LoginForm` - форма входа
- `RegisterForm` - форма регистрации
- `AuthContext` - контекст авторизации

### Посты
- `Post` - компонент поста
- `CreatePostForm` - форма создания поста
- `PostFeed` - лента постов
- `PhotoGrid` - сетка фотографий в посте

### Профиль
- `UserPage` - страница профиля
- `ServerImage` - компонент для отображения изображений
- `ImageUploader` - загрузка изображений
- `ImageSelector` - выбор изображений из галереи

## API

Взаимодействие с сервером осуществляется через `api.ts`:

```typescript
const api = {
  get: (endpoint: string) => {...},
  post: (endpoint: string, data?: any) => {...},
  put: (endpoint: string, data?: any) => {...},
  delete: (endpoint: string) => {...}
};
```

## Стили

- Используются CSS Modules для изоляции стилей
- Каждый компонент имеет свой `.module.css` файл
- Адаптивный дизайн с брейкпоинтами:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

## Маршрутизация

Основные маршруты:
- `/` - главная страница (лента)
- `/login` - страница входа
- `/register` - страница регистрации
- `/users/:id` - профиль пользователя

## Разработка

### Запуск

```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки
npm start

# Сборка для продакшена
npm run build
```

### Тестирование

```bash
# Запуск тестов
npm test

# Запуск тестов с покрытием
npm run test:coverage
```

### Линтинг

```bash
# Проверка кода
npm run lint

# Автоматическое исправление
npm run lint:fix
```

## Зависимости

Основные:
- react
- react-dom
- react-router-dom
- typescript
- @types/react
- @types/react-dom

Разработка:
- @typescript-eslint/eslint-plugin
- @typescript-eslint/parser
- eslint
- prettier
