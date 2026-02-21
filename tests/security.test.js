const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');

const { server } = require('../server.js');

let baseURL;

function request(urlPath) {
  return new Promise((resolve, reject) => {
    http.get(`${baseURL}${urlPath}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
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

describe('Directory traversal protection', () => {
  it('rejects /../server.js (path escaping public dir)', async () => {
    const res = await request('/../server.js');
    assert.ok(res.status === 403 || res.status === 404,
      `expected 403 or 404, got ${res.status}`);
    assert.ok(!res.body.includes('http.createServer'),
      'must not expose server.js source code');
  });

  it('rejects /../../etc/passwd', async () => {
    const res = await request('/../../etc/passwd');
    assert.ok(res.status === 403 || res.status === 404,
      `expected 403 or 404, got ${res.status}`);
  });

  it('rejects URL-encoded traversal /%2e%2e/server.js', async () => {
    const res = await request('/%2e%2e/server.js');
    assert.ok(res.status === 403 || res.status === 404,
      `expected 403 or 404, got ${res.status}`);
    assert.ok(!res.body.includes('http.createServer'),
      'must not expose server.js source code');
  });

  it('allows legitimate nested paths', async () => {
    const res = await request('/css/style.css');
    assert.equal(res.status, 200);
  });

  it('rejects path to questions directory', async () => {
    const res = await request('/../questions/demo-bloque1.json');
    assert.ok(res.status === 403 || res.status === 404,
      `expected 403 or 404, got ${res.status}`);
  });
});
