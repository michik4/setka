const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://odd-trees-wear.loca.lt',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api': '/api'
      },
      onProxyReq: (proxyReq, req, res) => {
        // Log the request
        console.log(`[PROXY] ${req.method} ${req.url} → ${proxyReq.path}`);
      },
      onProxyRes: (proxyRes, req, res) => {
        // Log the response
        console.log(`[PROXY] Response: ${proxyRes.statusCode}`);
      },
      onError: (err, req, res) => {
        console.error('[PROXY] Error:', err);
        res.writeHead(500, {
          'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({ message: 'Ошибка прокси-сервера' }));
      }
    })
  );
}; 