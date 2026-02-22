const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const publicDir = path.join(__dirname, 'public');
const sourcesDir = path.join(__dirname, 'sources');
const questionsDir = path.join(__dirname, 'questions'); // fallback for old quiz files

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  } catch (e) {
    res.writeHead(404);
    res.end('Not found');
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // === API: quiz data (reads from public/api/quizzes/, fallback to questions/) ===
  if (pathname.startsWith('/api/quizzes/') && req.method === 'GET') {
    const id = pathname.replace('/api/quizzes/', '').replace(/\.json$/, '');
    const publicPath = path.join(publicDir, 'api', 'quizzes', `${id}.json`);
    const legacyPath = path.join(questionsDir, `${id}.json`);
    const filePath = fs.existsSync(publicPath) ? publicPath : legacyPath;
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return sendJSON(res, data);
    } catch (e) {
      return sendJSON(res, { error: 'Quiz not found' }, 404);
    }
  }

  // === API: law source material (reads from sources/) ===
  if (pathname.startsWith('/api/sources/') && req.method === 'GET') {
    const id = pathname.replace('/api/sources/', '').replace(/\.json$/, '');
    const filePath = path.join(sourcesDir, `${id}.json`);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return sendJSON(res, data);
    } catch (e) {
      return sendJSON(res, { error: 'Source not found' }, 404);
    }
  }

  // === Everything else: serve static files from public/ ===
  let filePath = path.join(publicDir, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  sendFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`SARA running on http://localhost:${PORT}`);
});
