'use strict';

const { API_HOST } = require('../config');

function getScanPhotoUrl(context, photoId) {
  return `${API_HOST}/scan-photos/${photoId}/raw?token=${context.state.token}`;
}

module.exports = getScanPhotoUrl;
