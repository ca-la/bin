'use strict';

const { requireProperties } = require('../services/require-properties');

class PushToken {
  constructor(row) {
    requireProperties(row, 'id');

    this.id = row.id;
    this.userId = row.user_id;
    this.apnsDeviceToken = row.apns_device_token;
    this.anonymousId = row.anonymous_id;
  }
}

module.exports = PushToken;
