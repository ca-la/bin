'use strict';

const COLORS = require('../../services/colors');

// Log timing and status for each incoming request

function* logger(next) {
  const start = Date.now();
  yield next;
  const ms = Date.now() - start;

  const ip = this.request.headers['cf-connecting-ip'] || this.request.ip;
  const ua = this.request.headers['user-agent'];
  const client = this.request.headers['x-cala-app'];

  const statusColor = (this.status < 400) ? COLORS.green : COLORS.red;
  // eslint-disable-next-line no-console
  console.log(`${statusColor}${this.status}${COLORS.reset} ${this.method} ${COLORS.blue}${this.url}${COLORS.reset} ms:${ms} ip:${ip} ua:"${ua}" user:${this.state.userId || ''} client:${client}`);
}

module.exports = logger;
