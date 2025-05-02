#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# Проверка прав суперпользователя
check_sudo() {
  if [ "$(id -u)" -ne 0 ]; then
    error "Этот скрипт должен быть запущен с правами суперпользователя (sudo)."
  fi
}

# Настройка службы systemd
setup_systemd_service() {
  info "Настройка службы systemd для приложения Setka..."
  
  # Запрос пути к проекту
  read -p "Введите полный путь к директории проекта [$(pwd)]: " PROJECT_PATH
  PROJECT_PATH=${PROJECT_PATH:-$(pwd)}
  
  # Проверка существования директории
  if [ ! -d "$PROJECT_PATH" ]; then
    error "Директория $PROJECT_PATH не существует."
  fi
  
  # Проверка существования server директории
  if [ ! -d "$PROJECT_PATH/server" ]; then
    error "Директория $PROJECT_PATH/server не существует. Убедитесь, что вы указали правильный путь к проекту."
  fi
  
  # Проверка существования dist/index.js
  if [ ! -f "$PROJECT_PATH/server/dist/index.js" ]; then
    warn "Файл dist/index.js не найден. Возможно, проект не был собран."
    read -p "Хотите собрать проект сейчас? (y/N): " BUILD_PROJECT
    if [[ "$BUILD_PROJECT" =~ ^[Yy]$ ]]; then
      cd "$PROJECT_PATH/server" || error "Не удалось перейти в директорию сервера"
      npm install || error "Не удалось установить зависимости"
      npm run build || error "Не удалось собрать проект"
    else
      error "Необходимо собрать проект перед настройкой службы."
    fi
  fi
  
  # Запрос имени пользователя для запуска службы
  read -p "Введите имя пользователя для запуска службы [$(whoami)]: " SERVICE_USER
  SERVICE_USER=${SERVICE_USER:-$(whoami)}
  
  # Проверка существования пользователя
  if ! id -u "$SERVICE_USER" &>/dev/null; then
    error "Пользователь $SERVICE_USER не существует."
  fi
  
  # Запрос порта для приложения
  read -p "Введите порт для приложения [3001]: " SERVICE_PORT
  SERVICE_PORT=${SERVICE_PORT:-3001}
  
  # Создание файла службы systemd
  cat > /etc/systemd/system/setka.service <<EOL
[Unit]
Description=Setka Server Application
After=network.target postgresql.service

[Service]
Type=simple
User=${SERVICE_USER}
WorkingDirectory=${PROJECT_PATH}/server
ExecStart=/usr/bin/node ${PROJECT_PATH}/server/dist/index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=${SERVICE_PORT}

[Install]
WantedBy=multi-user.target
EOL
  
  info "Файл службы создан в /etc/systemd/system/setka.service"
  
  # Перезагрузка systemd для применения изменений
  systemctl daemon-reload || error "Не удалось перезагрузить systemd"
  
  # Включение службы для автозапуска при загрузке системы
  systemctl enable setka.service || warn "Не удалось включить службу для автозапуска"
  
  # Запуск службы
  systemctl start setka.service || warn "Не удалось запустить службу"
  
  # Проверка статуса службы
  if systemctl status setka.service &>/dev/null; then
    info "Служба setka.service успешно запущена"
  else
    warn "Служба setka.service не запущена. Проверьте журнал ошибок: journalctl -u setka.service"
  fi
  
  info "Для управления службой используйте следующие команды:"
  echo "sudo systemctl start setka.service - запустить службу"
  echo "sudo systemctl stop setka.service - остановить службу"
  echo "sudo systemctl restart setka.service - перезапустить службу"
  echo "sudo systemctl status setka.service - проверить статус службы"
  echo "sudo journalctl -u setka.service - просмотреть журнал службы"
}

# Настройка PM2 для управления процессом (рекомендуемый метод)
setup_pm2() {
  info "Настройка PM2 для управления процессом Setka..."
  
  # Проверка наличия PM2
  if ! command -v pm2 &>/dev/null; then
    warn "PM2 не установлен. Установка PM2..."
    npm install -g pm2 || error "Не удалось установить PM2"
  fi
  
  # Запрос пути к проекту
  read -p "Введите полный путь к директории проекта [$(pwd)]: " PROJECT_PATH
  PROJECT_PATH=${PROJECT_PATH:-$(pwd)}
  
  # Проверка существования директории
  if [ ! -d "$PROJECT_PATH" ]; then
    error "Директория $PROJECT_PATH не существует."
  fi
  
  # Проверка существования server директории
  if [ ! -d "$PROJECT_PATH/server" ]; then
    error "Директория $PROJECT_PATH/server не существует. Убедитесь, что вы указали правильный путь к проекту."
  fi
  
  # Переход в директорию сервера
  cd "$PROJECT_PATH/server" || error "Не удалось перейти в директорию сервера"
  
  # Запуск приложения через PM2
  pm2 start dist/index.js --name "setka-server" || error "Не удалось запустить приложение через PM2"
  
  # Сохранение текущего состояния PM2
  pm2 save || warn "Не удалось сохранить состояние PM2"
  
  # Настройка автозапуска PM2 при загрузке системы
  pm2 startup || warn "Не удалось настроить автозапуск PM2"
  info "Выполните команду, указанную выше (если она была выведена), чтобы настроить автозапуск PM2"
  
  info "PM2 настроен для управления приложением Setka"
  info "Для управления приложением используйте следующие команды:"
  echo "pm2 start setka-server - запустить приложение"
  echo "pm2 stop setka-server - остановить приложение"
  echo "pm2 restart setka-server - перезапустить приложение"
  echo "pm2 status - проверить статус приложения"
  echo "pm2 logs setka-server - просмотреть логи приложения"
  echo "pm2 monit - мониторинг приложения в реальном времени"
}

# Главная функция
main() {
  echo -e "${GREEN}=== Настройка фонового запуска приложения Setka ===${NC}"
  echo "Выберите метод настройки фонового запуска:"
  echo "1) Служба systemd (требуются права root)"
  echo "2) PM2 (рекомендуется для Node.js приложений)"
  
  read -p "Выберите метод (1/2): " SETUP_METHOD
  
  case $SETUP_METHOD in
    1)
      check_sudo
      setup_systemd_service
      ;;
    2)
      setup_pm2
      ;;
    *)
      error "Неверный выбор. Выберите 1 или 2."
      ;;
  esac
  
  info "Настройка фонового запуска завершена!"
}

# Запуск главной функции
main