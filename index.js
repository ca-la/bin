'use strict';

const koa = require('koa');

const app = koa();

const errors = require('./middleware/errors');
const jsonBody = require('./middleware/json-body');
const headers = require('./middleware/headers');
const logger = require('./middleware/logger');
const options = require('./middleware/options');
const attachSession = require('./middleware/attach-session');

// General middleware
app.use(logger);
app.use(errors);
app.use(jsonBody);
app.use(headers);
app.use(options);
app.use(attachSession);

// Route-specific middleware
app.use(require('./routes/addresses'));
app.use(require('./routes/orders'));
app.use(require('./routes/password-resets'));
app.use(require('./routes/root'));
app.use(require('./routes/scans'));
app.use(require('./routes/sessions'));
app.use(require('./routes/subscriptions'));
app.use(require('./routes/users'));
app.use(require('./routes/zips'));

if (!module.parent) {
  const port = process.env.PORT || 5100;
  app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Running on :${port}`);
}

module.exports = app;
