'use strict';

const compact = require('../compact');
const findDesignUsers = require('../../services/find-design-users');
const NotificationsDAO = require('../../dao/notifications');
const SectionsDAO = require('../../dao/product-design-sections');
const { requireValues } = require('../require-properties');

async function replaceNotifications({
  actorUserId,
  sectionId,
  designId,
  actionDescription,
  // A key used for grouping identical types of notifications. If multiple
  // notifications with the same actor+section+design+type are created in rapid
  // succession, we supersede the previous ones to create a single notification
  // for many similar actions (e.g. when editing a section)
  type
}) {
  requireValues({ designId, actorUserId, actionDescription, type });

  await NotificationsDAO.deleteRecent(compact({
    sectionId,
    designId,
    actorUserId,
    type
  }));

  const recipients = (await findDesignUsers(designId))
    .filter(user => user.id !== actorUserId);

  for (const recipient of recipients) {
    await NotificationsDAO.create({
      actionDescription,
      actorUserId,
      designId,
      recipientUserId: recipient.id,
      sectionId,
      type
    });
  }
}

async function getSection(sectionId) {
  const section = await SectionsDAO.findById(sectionId);
  if (!section) { throw new Error(`Could not find section ${section}`); }
  return section;
}

function getSectionTitle(section) {
  return section.title || 'Untitled';
}

async function sendSectionCreateNotifications({ sectionId, designId, userId }) {
  requireValues({ sectionId, designId, userId });

  await replaceNotifications({
    actorUserId: userId,
    sectionId,
    designId,
    actionDescription: 'created a new section',
    type: 'create-section'
  });
}

async function sendSectionDeleteNotifications({ sectionTitle, designId, userId }) {
  requireValues({ sectionTitle, designId, userId });

  await replaceNotifications({
    actorUserId: userId,
    designId,
    actionDescription: `deleted the "${sectionTitle}" section`,
    type: 'delete-section'
  });
}

async function sendDesignUpdateNotifications({ designId, userId }) {
  requireValues({ designId, userId });

  await replaceNotifications({
    actorUserId: userId,
    designId,
    actionDescription: 'updated the design information',
    type: 'update-design'
  });
}

async function sendSectionUpdateNotifications({ sectionId, designId, userId }) {
  requireValues({ sectionId, designId, userId });
  const section = await getSection(sectionId);

  await replaceNotifications({
    actorUserId: userId,
    sectionId,
    designId,
    actionDescription: `updated the "${getSectionTitle(section)}" section`,
    type: 'update-section'
  });
}

async function sendFeaturePlacementUpdateNotifications({ sectionId, designId, userId }) {
  requireValues({ sectionId, designId, userId });
  const section = await getSection(sectionId);

  await replaceNotifications({
    actorUserId: userId,
    sectionId,
    designId,
    actionDescription: `updated the artwork on the "${getSectionTitle(section)}" section`,
    type: 'update-feature-placement'
  });
}

async function sendSelectedOptionCreateNotifications({ sectionId, designId, userId }) {
  requireValues({ sectionId, designId, userId });
  const section = await getSection(sectionId);

  await replaceNotifications({
    actorUserId: userId,
    sectionId,
    designId,
    actionDescription: `added a material to the "${getSectionTitle(section)}" section`,
    type: 'create-selected-option'
  });
}

async function sendSelectedOptionDeleteNotifications({ sectionId, designId, userId }) {
  requireValues({ sectionId, designId, userId });
  const section = await getSection(sectionId);

  await replaceNotifications({
    actorUserId: userId,
    sectionId,
    designId,
    actionDescription: `removed a material from the "${getSectionTitle(section)}" section`,
    type: 'delete-selected-option'
  });
}

async function sendSelectedOptionUpdateNotifications({ sectionId, designId, userId }) {
  requireValues({ sectionId, designId, userId });
  const section = await getSection(sectionId);

  await replaceNotifications({
    actorUserId: userId,
    sectionId,
    designId,
    actionDescription: `updated a material on the "${getSectionTitle(section)}" section`,
    type: 'update-selected-option'
  });
}

module.exports = {
  sendDesignUpdateNotifications,
  sendFeaturePlacementUpdateNotifications,
  sendSectionCreateNotifications,
  sendSectionDeleteNotifications,
  sendSectionUpdateNotifications,
  sendSelectedOptionCreateNotifications,
  sendSelectedOptionDeleteNotifications,
  sendSelectedOptionUpdateNotifications
};
