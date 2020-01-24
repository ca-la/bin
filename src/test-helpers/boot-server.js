'use strict';

const test = require('tape');

// eslint-disable-next-line import/no-unresolved
const app = require('../index').default;

const port = process.env.TEST_PORT || 9001;

const server = app.listen(port);

// eslint-disable-next-line no-console
console.log(`Running test server on :${port}`);

test.onFinish(() => {
  server.close();
});

module.exports = {
  baseUrl: `http://localhost:${port}`
};
