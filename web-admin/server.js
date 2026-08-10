// server.js
const { createServer } = require('http');
const next = require('next');
const { initNotificationHub } = require('./src/lib/notificationHub');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize WebSocket hub on the same server
  initNotificationHub(server);

  const port = process.env.PORT || 3000;
  server.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
