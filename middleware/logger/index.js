'use strict';

// Log timing and status for each incoming request

function* logger(next) {
  const start = Date.now();
  yield next;
  const ms = Date.now() - start;

  const ip = this.request.headers['cf-connecting-ip'] || this.request.ip;
  const ua = this.request.headers['user-agent'];

  // eslint-disable-next-line no-console
  console.log(`${this.status} ${this.method} "${this.url}" ms:${ms} ip:${ip} ua:"${ua}" user:${this.state.userId || ''}`);
}

module.exports = logger;
