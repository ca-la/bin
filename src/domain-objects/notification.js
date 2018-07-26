'use strict';

const { requireProperties } = require('../services/require-properties');
const { default: DataMapper } = require('../services/data-mapper');

const keyNamesByColumnName = {
  id: 'id',
  design_id: 'designId',
  section_id: 'sectionId',
  actor_user_id: 'actorUserId',
  recipient_user_id: 'recipientUserId',
  action_description: 'actionDescription',
  created_at: 'createdAt',
  sent_email_at: 'sentEmailAt',
  type: 'type'
};

const dataMapper = new DataMapper(keyNamesByColumnName);

class Notification {
  constructor(row) {
    requireProperties(row, 'id');

    const data = dataMapper.rowDataToUserData(row);

    Object.assign(this, data, {
      createdAt: new Date(row.created_at),
      sentEmailAt: row.sent_email_at && new Date(row.sent_email_at)
    });
  }

  setActorUser(user) {
    this.actorUser = user;
  }
}

Notification.dataMapper = dataMapper;

module.exports = Notification;
