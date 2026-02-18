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
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const questionsDir = path.join(__dirname, 'questions');
const sourcesDir = path.join(__dirname, 'sources');
const publicDir = path.join(__dirname, 'public');

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

// Load quiz metadata
function getQuizList() {
  if (!fs.existsSync(questionsDir)) return [];
  
  return fs.readdirSync(questionsDir)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(questionsDir, f), 'utf8'));
        return {
          id: path.basename(f, '.json'),
          title: data.title || f,
          description: data.description || '',
          questionCount: (data.questions || []).length,
        };
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // API routes
  if ((pathname === '/api/quizzes' || pathname === '/api/quizzes.json') && req.method === 'GET') {
    return sendJSON(res, getQuizList());
  }

  if (pathname.startsWith('/api/quizzes/') && req.method === 'GET') {
    const id = pathname.split('/')[3].replace(/\.json$/, '');
    const filePath = path.join(questionsDir, `${id}.json`);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return sendJSON(res, data);
    } catch (e) {
      return sendJSON(res, { error: 'Quiz not found' }, 404);
    }
  }

  if (pathname.startsWith('/api/sources/') && req.method === 'GET') {
    const id = pathname.split('/')[3];
    const filePath = path.join(sourcesDir, `${id}.json`);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return sendJSON(res, data);
    } catch (e) {
      return sendJSON(res, { error: 'Source not found' }, 404);
    }
  }

  // Static files
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
