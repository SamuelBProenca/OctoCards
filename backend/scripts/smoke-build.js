'use strict';

const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const backendDirectory = path.resolve(__dirname, '..');
const serverEntry = path.join(backendDirectory, 'dist/src/index.js');

const reservePort = async () => {
  const server = net.createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
};

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const request = async (port, route) => {
  const response = await fetch('http://127.0.0.1:' + port + route);
  return { status: response.status, type: response.headers.get('content-type') || '', body: await response.text() };
};

const run = async () => {
  assert.ok(fs.existsSync(serverEntry), 'Build output is missing. Run npm run build first.');
  assert.ok(fs.existsSync(path.join(backendDirectory, 'dist/public/docs/index.html')), 'Documentation assets were not copied into dist/public.');

  const port = await reservePort();
  const child = spawn(process.execPath, [serverEntry], {
    cwd: backendDirectory,
    env: {
      ...process.env,
      PORT: String(port),
      OWNER: 'octocat',
      TOKEN: '',
      PLAYGROUND_ENABLED: 'false',
      API_RATE_LIMIT_MAX: '20',
      API_RATE_LIMIT_WINDOW_MS: '60000',
      TRUSTED_PROXIES: ''
    },
    stdio: 'ignore'
  });

  try {
    let verified = false;
    let lastError;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (child.exitCode !== null) {
        throw new Error('Compiled server exited before accepting HTTP requests.');
      }

      try {
        const root = await request(port, '/');
        assert.equal(root.status, 200);
        assert.match(root.type, /application\/json/);
        assert.match(root.body, /OctoCards API/);

        const docs = await request(port, '/docs/');
        assert.equal(docs.status, 200);
        assert.match(docs.body, /Use a API do seu jeito/);

        const stylesheet = await request(port, '/docs/docs.css');
        assert.equal(stylesheet.status, 200);
        assert.match(stylesheet.type, /text\/css/);

        const openapi = await request(port, '/swagger.yaml');
        assert.equal(openapi.status, 200);
        assert.match(openapi.body, /openapi: 3\.0\.3/);

        const invalidApiRequest = await request(port, '/api/cards');
        assert.equal(invalidApiRequest.status, 400);
        assert.match(invalidApiRequest.body, /INVALID_REQUEST/);
        verified = true;
        break;
      } catch (error) {
        lastError = error;
        await delay(100);
      }
    }

    assert.ok(verified, 'Compiled HTTP smoke test failed: ' + (lastError ? lastError.message : 'server did not become ready'));
    process.stdout.write('Production build smoke test passed.\n');
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await Promise.race([once(child, 'exit'), delay(2000)]);
    }
  }
};

run().catch((error) => {
  process.stderr.write(error.stack + '\n');
  process.exitCode = 1;
});
