const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');

const { server } = require('../server.js');

let baseURL;

// HTTP request helper using Node built-in http module
function request(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${baseURL}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json() { return JSON.parse(data); }
        });
      });
    }).on('error', reject);
  });
}

before(() => {
  return new Promise((resolve) => {
    server.listen(0, () => {
      const { port } = server.address();
      baseURL = `http://localhost:${port}`;
      resolve();
    });
  });
});

after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

// === GET /api/quizzes ===
describe('GET /api/quizzes', () => {
  it('returns 200 with JSON content-type', async () => {
    const res = await request('/api/quizzes');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('application/json'));
  });

  it('response is an array', async () => {
    const res = await request('/api/quizzes');
    const data = res.json();
    assert.ok(Array.isArray(data));
  });

  it('each item has id, title, description, questionCount', async () => {
    const res = await request('/api/quizzes');
    const data = res.json();
    assert.ok(data.length > 0, 'should have at least one quiz');
    for (const item of data) {
      assert.ok(typeof item.id === 'string', 'id must be a string');
      assert.ok(typeof item.title === 'string', 'title must be a string');
      assert.ok('description' in item, 'must have description');
      assert.ok(typeof item.questionCount === 'number', 'questionCount must be a number');
    }
  });

  it('count matches JSON files in questions/ directory', async () => {
    const res = await request('/api/quizzes');
    const data = res.json();
    const questionsDir = path.join(__dirname, '..', 'questions');
    const fileCount = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json')).length;
    assert.equal(data.length, fileCount);
  });

  it('also works with .json extension', async () => {
    const res = await request('/api/quizzes.json');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(Array.isArray(data));
  });
});

// === GET /api/quizzes/:id ===
describe('GET /api/quizzes/:id', () => {
  it('valid quiz ID returns 200 with JSON', async () => {
    const res = await request('/api/quizzes/demo-bloque1');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('application/json'));
  });

  it('response contains title and questions array', async () => {
    const res = await request('/api/quizzes/demo-bloque1');
    const data = res.json();
    assert.ok(typeof data.title === 'string');
    assert.ok(Array.isArray(data.questions));
    assert.ok(data.questions.length > 0);
  });

  it('each question has required fields', async () => {
    const res = await request('/api/quizzes/demo-bloque1');
    const data = res.json();
    for (const q of data.questions) {
      assert.ok(typeof q.pregunta === 'string');
      assert.ok(Array.isArray(q.opciones));
      assert.ok(typeof q.correcta === 'number');
      assert.ok(typeof q.explicacion === 'string');
    }
  });

  it('invalid quiz ID returns 404 with error', async () => {
    const res = await request('/api/quizzes/nonexistent-quiz-xyz');
    assert.equal(res.status, 404);
    const data = res.json();
    assert.ok(data.error);
  });

  it('works with .json extension', async () => {
    const res = await request('/api/quizzes/demo-bloque1.json');
    assert.equal(res.status, 200);
    const data = res.json();
    assert.ok(data.title);
  });
});

// === GET /api/sources/:id ===
describe('GET /api/sources/:id', () => {
  it('valid source ID returns 200 with JSON', async () => {
    const res = await request('/api/sources/constitucion-1978');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('application/json'));
  });

  it('response contains title and sections array', async () => {
    const res = await request('/api/sources/constitucion-1978');
    const data = res.json();
    assert.ok(typeof data.title === 'string');
    assert.ok(Array.isArray(data.sections));
    assert.ok(data.sections.length > 0);
  });

  it('each section has id, title, content', async () => {
    const res = await request('/api/sources/constitucion-1978');
    const data = res.json();
    for (const s of data.sections) {
      assert.ok(typeof s.id === 'string');
      assert.ok(typeof s.title === 'string');
      assert.ok(typeof s.content === 'string');
    }
  });

  it('invalid source ID returns 404 with error', async () => {
    const res = await request('/api/sources/nonexistent-source-xyz');
    assert.equal(res.status, 404);
    const data = res.json();
    assert.ok(data.error);
  });
});

// === Static file serving ===
describe('Static file serving', () => {
  it('GET / returns index.html with text/html', async () => {
    const res = await request('/');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/html'));
    assert.ok(res.body.includes('<!DOCTYPE html') || res.body.includes('<html'));
  });

  it('GET /css/style.css returns CSS', async () => {
    const res = await request('/css/style.css');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('text/css'));
  });

  it('GET /js/app.js returns JavaScript', async () => {
    const res = await request('/js/app.js');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('application/javascript'));
  });

  it('GET /js/quiz-logic.js returns JavaScript', async () => {
    const res = await request('/js/quiz-logic.js');
    assert.equal(res.status, 200);
    assert.ok(res.headers['content-type'].includes('application/javascript'));
  });

  it('nonexistent file returns 404', async () => {
    const res = await request('/nonexistent-file.html');
    assert.equal(res.status, 404);
  });
});
