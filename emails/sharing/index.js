'use strict';

const fs = require('fs');
const path = require('path');
const template = require('lodash/template');

const { requireProperties } = require('../../services/require-properties');

module.exports = function sharing(data) {
  requireProperties(data,
    'senderName',
    'roleDescription',
    'designTitle',
    'designUrl',
    'invitationMessage'
  );

  const emailHtml = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

  return template(emailHtml)(data);
};
