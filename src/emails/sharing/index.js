'use strict';

const template = require('lodash/template');
const emailHtml = require('./template');

const { requireProperties } = require('../../services/require-properties');

module.exports = function sharing(data) {
  requireProperties(data,
    'senderName',
    'roleDescription',
    'designTitle',
    'designUrl',
    'invitationMessage');

  return template(emailHtml)(data);
};
