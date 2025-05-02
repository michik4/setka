#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
REPO_URL="https://github.com/michik4/setka.git"

# Функция для вывода информации
info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

# Функция для вывода предупреждений
warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

# Функция для вывода ошибок
error() {
  echo -e "${RED}[ERROR]${NC} $1"
  exit 1
}

# Проверка зависимостей
check_dependencies() {
  info "Проверка зависимостей..."
  
  # Проверка Git
  if ! command -v git &> /dev/null; then
    error "Git не установлен. Установите Git с помощью: sudo apt-get install git"
  fi
  
  # Проверка Node.js
  if ! command -v node &> /dev/null; then
    error "Node.js не установлен. Установите Node.js (минимум 16 версии)"
  fi
  
  NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
  if [ "$NODE_VERSION" -lt 16 ]; then
    error "Требуется Node.js версии 16 или выше. Текущая версия: $(node -v)"
  fi
  
  # Проверка npm
  if ! command -v npm &> /dev/null; then
    error "npm не установлен. Обычно устанавливается вместе с Node.js"
  fi
  
  # Проверка PostgreSQL
  if ! command -v psql &> /dev/null; then
    warn "PostgreSQL не найден. Убедитесь, что PostgreSQL (минимум 12 версии) установлен и запущен"
  fi
  
  info "Все основные зависимости установлены"
}

# Клонирование репозитория
clone_repository() {
  info "Клонирование репозитория..."
  
  # Проверяем, указан ли URL репозитория
  if [ -z "$REPO_URL" ]; then
    read -p "Введите URL репозитория для клонирования: " REPO_URL
  fi
  
  # Клонируем репозиторий
  git clone "$REPO_URL" setka || error "Не удалось клонировать репозиторий"
  
  cd setka || error "Не удалось перейти в директорию проекта"
  info "Репозиторий успешно клонирован в директорию $(pwd)"
}

# Создаем .env файлы
create_env_files() {
  info "Создание .env файлов..."

  read -p "Введите порт сервера [3001]: " SERVER_PORT
  SERVER_PORT=${SERVER_PORT:-3001}
  
  read -p "Введите хост сервера [localhost]: " SERVER_HOST
  SERVER_HOST=${SERVER_HOST:-localhost}
  
  read -p "Введите хост клиента [localhost]: " CLIENT_HOST
  CLIENT_HOST=${CLIENT_HOST:-localhost}

  read -p "Введите порт клиента [3000]: " CLIENT_PORT
  CLIENT_PORT=${CLIENT_PORT:-3000}

  # Запрос параметров подключения к БД
  read -p "Введите имя пользователя PostgreSQL [postgres]: " DB_USER
  DB_USER=${DB_USER:-postgres}
  
  read -p "Введите пароль PostgreSQL [postgres]: " DB_PASSWORD
  DB_PASSWORD=${DB_PASSWORD:-postgres}
  
  read -p "Введите имя БД [setka]: " DB_NAME
  DB_NAME=${DB_NAME:-setka}
  
  read -p "Введите хост БД [localhost]: " DB_HOST
  DB_HOST=${DB_HOST:-localhost}
  
  read -p "Введите порт БД [5432]: " DB_PORT
  DB_PORT=${DB_PORT:-5432}
  
  read -p "Введите секретный ключ JWT [random_key_$(date +%s)]: " JWT_SECRET
  JWT_SECRET=${JWT_SECRET:-random_key_$(date +%s)}
  

  # Создаем .env для клиента
  cat > client/.env <<EOL
REACT_APP_API_URL=http://${SERVER_HOST}:${SERVER_PORT}
REACT_APP_UPLOAD_URL=http://${SERVER_HOST}:${SERVER_PORT}/uploads
REACT_APP_MAX_FILE_SIZE=5242880
EOL
  
  # Создаем .env для сервера
  cat > server/.env <<EOL
PORT=${SERVER_PORT}
HOST=${SERVER_HOST}

CLIENT_URL=http://${CLIENT_HOST}:${CLIENT_PORT}

NODE_ENV=development
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=30d
UPLOAD_DIR=uploads
EOL
  
  info "Файлы .env успешно созданы"
}

# Создание базы данных PostgreSQL (не используется)

# setup_database() {
#   info "Настройка базы данных..."
  
#   # Проверяем, существует ли БД
#   if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
#     warn "База данных $DB_NAME уже существует"
#   else
#     info "Создание базы данных $DB_NAME..."
#     PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" || error "Не удалось создать базу данных"
#   fi
  
#   # Миграция базы данных
#   info "Применение миграций..."
#   cd server || error "Не удалось перейти в директорию сервера"
  
#   # Применяем все SQL-файлы миграций
#   for MIGRATION_FILE in migrate*.sql; do
#     if [ -f "$MIGRATION_FILE" ]; then
#       info "Применение миграции $MIGRATION_FILE..."
#       PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$MIGRATION_FILE" || warn "Проблема при применении миграции $MIGRATION_FILE"
#     fi
#   done
  
#   info "База данных настроена"
#   cd ..
# }

# Установка зависимостей и запуск сервера
setup_server() {
  info "Настройка сервера..."
  
  cd server || error "Не удалось перейти в директорию сервера"
  
  # Установка зависимостей
  info "Установка зависимостей сервера..."
  npm install || error "Не удалось установить зависимости сервера"
  
  # Создание директории uploads, если она не существует
  if [ ! -d "uploads" ]; then
    mkdir uploads
    info "Создана директория uploads"
  fi
  
  # Сборка проекта
  info "Сборка сервера..."
  npm run build || warn "Возникли проблемы при сборке сервера"
  
  # Запуск сервера в фоновом режиме через pm2, если он установлен
  if command -v pm2 &> /dev/null; then
    info "Запуск сервера через pm2..."
    pm2 start dist/index.js --name "setka-server" || error "Не удалось запустить сервер через pm2"
  else
    warn "pm2 не установлен. Для запуска сервера в режиме демона рекомендуется использовать pm2"
    warn "Установите pm2 с помощью: npm install -g pm2"
    info "Запуск сервера в режиме разработки..."
    echo "Для запуска сервера выполните:"
    echo "cd server && npm run dev"
  fi
  
  cd ..
}

# Установка зависимостей клиента
setup_client() {
  info "Настройка клиента..."
  
  cd client || error "Не удалось перейти в директорию клиента"
  
  # Установка зависимостей
  info "Установка зависимостей клиента..."
  npm install || error "Не удалось установить зависимости клиента"
  
  # Сборка клиента
  info "Сборка клиента для продакшн (опционально)..."
  read -p "Хотите собрать клиент для продакшн? (y/N): " BUILD_PROD
  if [[ "$BUILD_PROD" =~ ^[Yy]$ ]]; then
    npm run build || warn "Возникли проблемы при сборке клиента"
    
    # Настройка Nginx, если он установлен
    if command -v nginx &> /dev/null; then
      info "Nginx обнаружен. Хотите настроить Nginx для раздачи статики клиента?"
      read -p "Настроить Nginx? (y/N): " SETUP_NGINX
      
      if [[ "$SETUP_NGINX" =~ ^[Yy]$ ]]; then
        # Помощь по Nginx
        echo "Для настройки Nginx создайте файл /etc/nginx/sites-available/setka.conf со следующим содержимым:"
        echo "server {"
        echo "  listen 80;"
        echo "  server_name your-domain.com;"
        echo "  root $(pwd)/build;"
        echo "  index index.html;"
        echo "  location / {"
        echo "    try_files \$uri \$uri/ /index.html;"
        echo "  }"
        echo "  location /api {"
        echo "    proxy_pass http://localhost:${SERVER_PORT};"
        echo "    proxy_http_version 1.1;"
        echo "    proxy_set_header Upgrade \$http_upgrade;"
        echo "    proxy_set_header Connection 'upgrade';"
        echo "    proxy_set_header Host \$host;"
        echo "    proxy_cache_bypass \$http_upgrade;"
        echo "  }"
        echo "  location /uploads {"
        echo "    proxy_pass http://localhost:${SERVER_PORT}/uploads;"
        echo "  }"
        echo "}"
        echo ""
        echo "Затем выполните:"
        echo "sudo ln -s /etc/nginx/sites-available/setka.conf /etc/nginx/sites-enabled/"
        echo "sudo nginx -t"
        echo "sudo systemctl restart nginx"
      fi
    else
      warn "Nginx не установлен. Для раздачи статики в продакшн рекомендуется использовать Nginx"
      warn "Используем встроенную в Node.js проксирование статики"
      mv build ../server/public/ || error "Не удалось переместить сборку в директорию сервера"
      info "Сборка клиента перемещена в директорию сервера"
    fi
  else
    info "Для запуска клиента в режиме разработки выполните:"
    echo "cd client && npm start"
  fi
  
  cd ..
}

# Главная функция
main() {
  info "Начало установки Setka..."
  
  # Если переданы аргументы, используем их как URL репозитория
  if [ $# -gt 0 ]; then
    REPO_URL="$1"
  fi
  
  # Проверка и установка зависимостей
  check_dependencies
  
  # Клонирование репозитория
  clone_repository
  
  # Создание .env файлов
  create_env_files
  
  # Настройка базы данных (не используется из-за нарушений в миграциях)
  # setup_database
  
  # Настройка и запуск сервера
  setup_server
  
  # Настройка клиента
  setup_client
  
  info "Установка Setka завершена успешно!"
  info "Сервер: http://localhost:${SERVER_PORT}"
  info "Клиент (в режиме разработки): http://localhost:3000"
}

# Запуск главной функции с переданными аргументами
main "$@" 