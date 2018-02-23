'use strict';

const groupBy = require('lodash/groupBy');

const db = require('../../services/db');
const Logger = require('../../services/logger');
const EmailService = require('../../services/email');
const NotificationsDAO = require('../../dao/notifications');
const ProductDesignsDAO = require('../../dao/product-designs');
const UsersDAO = require('../../dao/users');

async function attachActor(notification) {
  const user = await UsersDAO.findById(notification.actorUserId);
  notification.setActorUser(user);

  return notification;
}
async function sendBatchNotificationEmails() {
  return db.transaction(async (trx) => {
    const notifications = await NotificationsDAO.findOutstandingTrx(trx);
    Logger.log(`Processing ${notifications.length} outstanding notifications`);

    for (const notification of notifications) {
      await attachActor(notification);
    }

    const notificationsByRecipient = groupBy(
      notifications,
      notification => notification.recipientUserId
    );

    for (const recipientUserId of Object.keys(notificationsByRecipient)) {
      const userNotifications = notificationsByRecipient[recipientUserId];

      const notificationsByDesign = groupBy(
        userNotifications,
        notification => notification.designId
      );

      const recipient = await UsersDAO.findById(recipientUserId);
      if (!recipient) { throw new Error(`Could not find user ${recipientUserId}`); }

      for (const designId of Object.keys(notificationsByDesign)) {
        const designNotifications = notificationsByDesign[designId];

        const design = await ProductDesignsDAO.findById(designId);
        if (!design) { throw new Error(`Could not find design ${designId}`); }

        Logger.log(`Enqueuing an email with ${designNotifications.length} notifications for User ${recipientUserId} & Design ${designId}`);
        await EmailService.enqueueSend({
          to: recipient.email,
          templateName: 'design_notifications',
          params: {
            design,
            notificationsWithActors: designNotifications
          }
        });
      }
    }

    const ids = notifications.map(notification => notification.id);

    await NotificationsDAO.markSentTrx(ids, trx);
  });
}

module.exports = sendBatchNotificationEmails;
