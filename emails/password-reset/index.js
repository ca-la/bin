'use strict';

const requireProperties = require('../../services/require-properties');

module.exports = function passwordReset(data) {
  requireProperties(data,
    'sessionId',
    'name'
  );

  return `Hi ${data.name},

We've received a request to reset your password on CALA.

To choose a new password, click this link: https://ca.la/password-reset?sessionId=${data.sessionId}

If you didn't request this, please let us know.`;
};
