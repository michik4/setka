// Для использования проксирования API в клиентском приложении:

// 1. Создайте файл setupProxy.js в папке client/src
// Содержимое файла:

const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://83.217.221.213:3000',
      changeOrigin: true,
    })
  );
};

// 2. В файле client/src/config/constants.ts установите:
export const API_URL = '/api';

// 3. Убедитесь, что в package.json клиента отсутствует "proxy" строка

// Эта настройка позволит клиенту при разработке автоматически проксировать 
// запросы к /api на указанный сервер, и куки будут работать корректно. 