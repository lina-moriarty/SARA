const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

const { sendJSON, sendFile, getQuizList, MIME_TYPES } = require('../server.js');

// Mock response object
function mockResponse() {
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    writeHead(status, headers) {
      this.statusCode = status;
      if (headers) Object.assign(this.headers, headers);
    },
    end(body) {
      this.body = body;
    }
  };
  return res;
}

// === MIME_TYPES ===
describe('MIME_TYPES', () => {
  it('.html maps to text/html', () => {
    assert.equal(MIME_TYPES['.html'], 'text/html');
  });

  it('.css maps to text/css', () => {
    assert.equal(MIME_TYPES['.css'], 'text/css');
  });

  it('.js maps to application/javascript', () => {
    assert.equal(MIME_TYPES['.js'], 'application/javascript');
  });

  it('.json maps to application/json', () => {
    assert.equal(MIME_TYPES['.json'], 'application/json');
  });

  it('.png maps to image/png', () => {
    assert.equal(MIME_TYPES['.png'], 'image/png');
  });

  it('.svg maps to image/svg+xml', () => {
    assert.equal(MIME_TYPES['.svg'], 'image/svg+xml');
  });

  it('.ico maps to image/x-icon', () => {
    assert.equal(MIME_TYPES['.ico'], 'image/x-icon');
  });
});

// === sendJSON ===
describe('sendJSON', () => {
  it('sets content-type to application/json', () => {
    const res = mockResponse();
    sendJSON(res, { test: true });
    assert.equal(res.headers['Content-Type'], 'application/json');
  });

  it('uses status 200 by default', () => {
    const res = mockResponse();
    sendJSON(res, { test: true });
    assert.equal(res.statusCode, 200);
  });

  it('uses custom status code', () => {
    const res = mockResponse();
    sendJSON(res, { error: 'not found' }, 404);
    assert.equal(res.statusCode, 404);
  });

  it('serializes data as JSON', () => {
    const res = mockResponse();
    const data = { key: 'value', number: 42 };
    sendJSON(res, data);
    assert.equal(res.body, JSON.stringify(data));
  });

  it('handles arrays', () => {
    const res = mockResponse();
    const data = [1, 2, 3];
    sendJSON(res, data);
    assert.equal(res.body, '[1,2,3]');
  });

  it('handles empty objects', () => {
    const res = mockResponse();
    sendJSON(res, {});
    assert.equal(res.body, '{}');
  });
});

// === sendFile ===
describe('sendFile', () => {
  it('serves an existing file with correct MIME type', () => {
    const res = mockResponse();
    const filePath = path.join(__dirname, '..', 'public', 'index.html');
    sendFile(res, filePath);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Content-Type'], 'text/html');
    assert.ok(res.body);
  });

  it('returns 404 for non-existent file', () => {
    const res = mockResponse();
    sendFile(res, '/nonexistent/path/file.html');
    assert.equal(res.statusCode, 404);
    assert.equal(res.body, 'Not found');
  });

  it('uses application/octet-stream for unknown extension', () => {
    // Create a temp file with unknown extension
    const tmpFile = path.join(__dirname, 'temp-test-file.xyz');
    fs.writeFileSync(tmpFile, 'test content');
    try {
      const res = mockResponse();
      sendFile(res, tmpFile);
      assert.equal(res.statusCode, 200);
      assert.equal(res.headers['Content-Type'], 'application/octet-stream');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });
});

// === getQuizList ===
describe('getQuizList', () => {
  it('returns an array', () => {
    const result = getQuizList();
    assert.ok(Array.isArray(result));
  });

  it('each item has id, title, description, questionCount', () => {
    const result = getQuizList();
    assert.ok(result.length > 0, 'should have at least one quiz');
    for (const item of result) {
      assert.ok(typeof item.id === 'string', 'id must be string');
      assert.ok(typeof item.title === 'string', 'title must be string');
      assert.ok('description' in item, 'must have description');
      assert.ok(typeof item.questionCount === 'number', 'questionCount must be number');
    }
  });

  it('id does not include .json extension', () => {
    const result = getQuizList();
    for (const item of result) {
      assert.ok(!item.id.endsWith('.json'), `id "${item.id}" should not end with .json`);
    }
  });

  it('questionCount matches actual question count in file', () => {
    const result = getQuizList();
    const questionsDir = path.join(__dirname, '..', 'questions');
    for (const item of result) {
      const data = JSON.parse(fs.readFileSync(path.join(questionsDir, `${item.id}.json`), 'utf8'));
      assert.equal(item.questionCount, data.questions.length,
        `${item.id}: questionCount ${item.questionCount} != actual ${data.questions.length}`);
    }
  });
});
