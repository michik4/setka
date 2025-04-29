#!/bin/bash
echo "Обновление клиентского приложения..."

# Создание .env файла
cd ~/client/client_dump
echo "Создание файла .env с правильными переменными окружения..."
cat > .env << 'EOF'
REACT_APP_API_URL=http://83.217.221.213:3000/api
REACT_APP_MEDIA_URL=http://83.217.221.213:3000/api/media
EOF
echo "Файл .env создан."

# Сборка приложения
echo "Сборка приложения..."
npm run build

# Копирование файлов на сервер
echo "Копирование файлов в папку ~/server/public..."
mkdir -p ~/server/public
rm -rf ~/server/public/*
cp -r build/* ~/server/public/

echo "Готово! Файлы клиента скопированы в папку server/public."
echo "Не забудьте перезапустить сервер, если это необходимо." 