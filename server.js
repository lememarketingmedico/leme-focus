const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendFile(res, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Erro interno ao carregar arquivo.');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', app: 'LEME Focus Simples' }));
    return;
  }

  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const safePath = path.normalize(path.join(PUBLIC_DIR, urlPath));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Acesso negado.');
    return;
  }

  fs.stat(safePath, (error, stat) => {
    if (!error && stat.isFile()) {
      sendFile(res, safePath);
      return;
    }
    sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
  });
});

server.listen(PORT, () => {
  console.log(`LEME Focus Simples rodando na porta ${PORT}`);
});
