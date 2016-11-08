'use strict';

const koa = require('koa');

const app = koa();

const errors = require('./middleware/errors');
const headers = require('./middleware/headers');
const jsonBody = require('./middleware/json-body');
const logger = require('./middleware/logger');
const options = require('./middleware/options');

// General middleware
app.use(logger);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);

// Route-specific middleware
app.use(require('./routes/users'));
app.use(require('./routes/sessions'));
app.use(require('./routes/subscriptions'));

if (!module.parent) {
  const port = process.env.PORT || 5100;
  app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Running on :${port}`);
}

module.exports = app;
