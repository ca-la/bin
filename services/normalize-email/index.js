'use strict';

function normalizeEmail(email) {
  return email.toLowerCase().trim();
}

module.exports = normalizeEmail;
