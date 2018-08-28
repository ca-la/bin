'use strict';

const rethrow = require('pg-rethrow');
const uuid = require('node-uuid');

const db = require('../../services/db');
const first = require('../../services/first').default;
const Notification = require('../../domain-objects/notification');

const instantiate = row => new Notification(row);

const { dataMapper } = Notification;

const TABLE_NAME = 'notifications';

async function findOutstandingTrx(trx) {
  return db(TABLE_NAME)
    .transacting(trx)
    .where({ sent_email_at: null })
    .orderBy('created_at', 'asc')
    .then(notifications => notifications.map(instantiate))
    .catch(rethrow);
}

async function markSentTrx(ids, trx) {
  return db(TABLE_NAME)
    .transacting(trx)
    .whereIn('id', ids)
    .update({ sent_email_at: (new Date()).toISOString() }, '*')
    .then(notifications => notifications.map(instantiate))
    .catch(rethrow);
}

async function create(data) {
  const rowData = Object.assign({}, dataMapper.userDataToRowData(data), {
    id: uuid.v4()
  });

  return db(TABLE_NAME)
    .insert(rowData, '*')
    .then(first)
    .then(instantiate)
    .catch(rethrow);
}

/**
 * Delete recent identical notifications, i.e. to batch up groups of many
 * "someone edited this text" actions into one single message.
 *
 * Note that the interval here does *not* have to be kept in sync with the
 * `purge-notification` stuff. It only represents the length of time during
 * which related notifications are considered to be the same action. In fact, we
 * might even want to experiment with lowering it to make sure we're getting
 * granular enough changes.
 */
function deleteRecent(userData) {
  const rowData = dataMapper.userDataToRowData(userData);

  const now = Date.now();
  const startingThreshold = now - (1000 * 60 * 5); // 5 minutes ago

  return db(TABLE_NAME)
    .where(rowData)
    .andWhere('created_at', '>', (new Date(startingThreshold)).toISOString())
    .andWhere({ sent_email_at: null })
    .del();
}

module.exports = {
  create,
  deleteRecent,
  findOutstandingTrx,
  markSentTrx
};
