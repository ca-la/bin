'use strict';

const { enqueueMessage } = require('../aws');
const { requireProperties } = require('../require-properties');
const {
  AWS_NOTIFICATION_SQS_URL,
  AWS_NOTIFICATION_SQS_REGION
} = require('../../config');

function enqueueSend(data) {
  requireProperties(data, 'channel', 'templateName', 'params');

  return enqueueMessage(
    AWS_NOTIFICATION_SQS_URL,
    AWS_NOTIFICATION_SQS_REGION,
    'slack',
    data
  );
}

module.exports = {
  enqueueSend
};
