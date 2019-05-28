'use strict';

const template = require('lodash/template');
const emailHtml = require('./template');

const { requireProperties } = require('../../services/require-properties');

module.exports = function passwordReset(data) {
  requireProperties(data, 'sessionId', 'name');

  const resetLink = `https://ca.la/password-reset?sessionId=${data.sessionId}`;

  return template(emailHtml)({ resetLink });
};
