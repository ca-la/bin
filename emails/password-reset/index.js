'use strict';

const fs = require('fs');
const path = require('path');
const template = require('lodash/template');

const { requireProperties } = require('../../services/require-properties');

module.exports = function passwordReset(data) {
  requireProperties(data,
    'sessionId',
    'name');

  const resetLink = `https://ca.la/password-reset?sessionId=${data.sessionId}`;

  const emailHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

  return template(emailHtml)({ resetLink });
};
