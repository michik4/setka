#!/bin/bash
echo "Сборка клиентского приложения..."
cd ~/client/client_dump
npm run build

echo "Копирование файлов в папку ~/server/public..."
mkdir -p ~/server/public
rm -rf ~/server/public/*
cp -r build/* ~/server/public/

echo "Готово! Файлы клиента скопированы в папку ~/server/public."
echo "Теперь используйте Node.js для запуска сервера, и он будет раздавать клиентское приложение." 