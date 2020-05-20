"use strict";

function* options(next) {
  if (this.method !== "OPTIONS") {
    return yield next;
  }

  this.status = 204;
  this.body = null;
  return yield next;
}

module.exports = options;
