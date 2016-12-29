'use strict';

const qs = require('querystring');

// Log timing and status for each incoming request

function stringify(obj) {
  const escaped = {};

  Object.keys(obj).forEach((key) => {
    escaped[key] = JSON.stringify(obj[key]);
  });

  return qs.stringify(escaped, ', ', '=', {
    encodeURIComponent: val => val
  });
}

function* logger(next) {
  const start = Date.now();
  yield next;
  const ms = Date.now() - start;

  // eslint-disable-next-line no-console
  console.log(stringify({
    method: this.method,
    url: this.url,
    status: this.status,
    responseTime: ms,
    requestIp: this.request.ip,
    connectingIp: this.request.headers['cf-connecting-ip'],
    userAgent: this.request.headers['user-agent']
  }));
}

module.exports = logger;
