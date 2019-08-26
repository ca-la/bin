import * as tape from 'tape';

import { sandbox, test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');

import * as CollectionsDAO from '../collections/dao';
import * as DesignsDAO from '../product-designs/dao';
import * as MeasurementsDAO from '../../dao/product-design-canvas-measurements';
import generateNotification from '../../test-helpers/factories/notification';
import { createNotificationMessage } from './notification-messages';
import { STUDIO_HOST } from '../../config';
import { Notification, NotificationType } from './domain-object';
import generateCollection from '../../test-helpers/factories/collection';
import * as NotificationAnnouncer from '../iris/messages/notification';

test(
  'notification messages returns annotation comment create message to the user' +
    ' if resources exist',
  async (t: tape.Test) => {
    sandbox()
      .stub(NotificationAnnouncer, 'announceNotificationCreation')
      .resolves({});
    const userOne = await createUser();

    const { collection } = await generateCollection({
      createdBy: userOne.user.id,
      title: 'test'
    });
    if (!collection) {
      throw new Error('Could not create collection');
    }

    const {
      notification: annCommCreateDesignNotification,
      design,
      actor
    } = await generateNotification({
      collectionId: collection.id,
      recipientUserId: userOne.user.id,
      type: NotificationType.ANNOTATION_COMMENT_CREATE
    });
    const {
      notification: annCommCreateDesignDeleted,
      design: annCommCreateDesign
    } = await generateNotification({
      actorUserId: userOne.user.id,
      collectionId: collection.id,
      type: NotificationType.ANNOTATION_COMMENT_CREATE
    });
    await DesignsDAO.deleteById(annCommCreateDesign.id);

    const annCommCreateMessage = await createNotificationMessage(
      annCommCreateDesignNotification
    );
    if (!annCommCreateMessage) {
      throw new Error('Did not create message');
    }
    t.assert(
      annCommCreateMessage.html.includes(design.title || 'test'),
      'message html contains the design title'
    );
    t.assert(
      annCommCreateMessage.actor && annCommCreateMessage.actor.id === actor.id,
      'message actor is the user'
    );
    const { mentions } = annCommCreateMessage.attachments[0];
    t.assert(
      mentions && Object.keys(mentions).length === 1,
      'message attachments contains one mention'
    );
    const annCommCreateDeletedMessage = await createNotificationMessage(
      annCommCreateDesignDeleted
    );
    t.assert(
      annCommCreateDeletedMessage === null,
      'No message is created for a deleted subresource'
    );
  }
);

test('notification messages returns annotation mention message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const {
    notification: annMenNotification,
    design,
    actor
  } = await generateNotification({
    type: NotificationType.ANNOTATION_COMMENT_MENTION
  });
  const {
    notification: annMenDeleted,
    design: annMenDesign
  } = await generateNotification({
    type: NotificationType.ANNOTATION_COMMENT_MENTION
  });
  await DesignsDAO.deleteById(annMenDesign.id);

  const message = await createNotificationMessage(annMenNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(design.title || 'test'),
    'message html contains the design title'
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    'message.actor && message.actor.id is the user'
  );
  const { mentions } = message.attachments[0];
  t.assert(
    mentions && Object.keys(mentions).length === 1,
    'message attachments contains one mention'
  );
  const messageDeleted = await createNotificationMessage(annMenDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages returns collection submit message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();

  const { collection } = await generateCollection({
    createdBy: userOne.user.id,
    title: 'test'
  });
  if (!collection) {
    throw new Error('Could not create collection');
  }

  const { notification: collSubNotification } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.COLLECTION_SUBMIT
  });
  const { notification: collSubDeleted } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.COLLECTION_SUBMIT
  });

  const message = await createNotificationMessage(collSubNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(collection.title || 'test'),
    'message html contains the collection title'
  );
  t.assert(
    message.actor && message.actor.id === userOne.user.id,
    'message.actor && message.actor.id is the user'
  );
  t.assert(
    message.html.indexOf(
      `<a href="${STUDIO_HOST}/collections/${collection.id}/designs">`
    ) !== -1,
    'message link goes to correct collection'
  );
  await CollectionsDAO.deleteById(collection.id);
  const messageDeleted = await createNotificationMessage(collSubDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages returns commit cost inputs message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();

  const { collection } = await generateCollection({
    createdBy: userOne.user.id,
    title: 'test'
  });
  if (!collection) {
    throw new Error('Could not create collection');
  }

  const { notification: comCosInpNotification } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.COMMIT_COST_INPUTS
  });
  const { notification: comCosInpDeleted } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.COMMIT_COST_INPUTS
  });

  const message = await createNotificationMessage(comCosInpNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(collection.title || 'test'),
    'message html contains the collection title'
  );
  t.assert(
    message.actor && message.actor.id === userOne.user.id,
    'message.actor && message.actor.id is the user'
  );
  t.assert(
    message.html.indexOf(
      `<a href="${STUDIO_HOST}/collections/${
        collection.id
      }/designs?isCheckout=true">`
    ) !== -1,
    'message link goes to correct collection'
  );
  await CollectionsDAO.deleteById(collection.id);
  const messageDeleted = await createNotificationMessage(comCosInpDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages returns invite collaborator message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const userOne = await createUser();

  const { collection } = await generateCollection({
    createdBy: userOne.user.id,
    title: 'test'
  });
  if (!collection) {
    throw new Error('Could not create collection');
  }

  const { notification: invColNotification } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.INVITE_COLLABORATOR
  });
  const {
    notification: invColDeleted,
    design: invColDesign
  } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.INVITE_COLLABORATOR
  });
  await DesignsDAO.deleteById(invColDesign.id);

  const message = await createNotificationMessage(invColNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(collection.title || 'test'),
    'message html contains the collection title'
  );
  t.assert(
    message.actor && message.actor.id === userOne.user.id,
    'message.actor && message.actor.id is the user'
  );
  t.assert(
    message.html.indexOf(
      `<a href="${STUDIO_HOST}/collections/${collection.id}/designs">`
    ) !== -1,
    'message link goes to correct collection'
  );
  await CollectionsDAO.deleteById(collection.id);
  const messageDeleted = await createNotificationMessage(invColDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages returns measurement create message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const {
    notification: meaCreNotification,
    design,
    actor
  } = await generateNotification({
    type: NotificationType.MEASUREMENT_CREATE
  });
  const {
    notification: meaCreDeleted,
    measurement: meaCreMeasurement
  } = await generateNotification({
    type: NotificationType.MEASUREMENT_CREATE
  });
  const {
    notification: meaCreDesDeleted,
    design: meaCreDesign
  } = await generateNotification({
    type: NotificationType.MEASUREMENT_CREATE
  });
  await MeasurementsDAO.deleteById(meaCreMeasurement.id);
  await DesignsDAO.deleteById(meaCreDesign.id);

  const message = await createNotificationMessage(meaCreNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(design.title || 'test'),
    'message html contains the design title'
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    'message.actor && message.actor.id is the user'
  );
  const messageDeleted = await createNotificationMessage(meaCreDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
  const messageDesDeleted = await createNotificationMessage(meaCreDesDeleted);
  t.assert(
    messageDesDeleted === null,
    'No message is created for a deleted design subresource'
  );
});

test(
  'notification messages returns partner accept service bid message to the user' +
    ' if resources exist',
  async (t: tape.Test) => {
    sandbox()
      .stub(NotificationAnnouncer, 'announceNotificationCreation')
      .resolves({});
    const {
      notification: parAccSerBidNotification,
      design,
      actor
    } = await generateNotification({
      type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
    });
    const {
      notification: parAccSerBidDeleted,
      design: parAccSerBidDesign
    } = await generateNotification({
      type: NotificationType.PARTNER_ACCEPT_SERVICE_BID
    });
    await DesignsDAO.deleteById(parAccSerBidDesign.id);

    const message = await createNotificationMessage(parAccSerBidNotification);
    if (!message) {
      throw new Error('Did not create message');
    }
    t.assert(
      message.html.includes(design.title),
      'message html contains the design title'
    );
    t.assert(
      message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user'
    );
    const messageDeleted = await createNotificationMessage(parAccSerBidDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource'
    );
  }
);

test('notification messages returns partner design bid message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const {
    notification: parDesBidNotification,
    actor
  } = await generateNotification({
    type: NotificationType.PARTNER_DESIGN_BID
  });
  const {
    notification: parDesBidDeleted,
    design: parDesBidDesign
  } = await generateNotification({
    type: NotificationType.PARTNER_DESIGN_BID
  });
  await DesignsDAO.deleteById(parDesBidDesign.id);

  const message = await createNotificationMessage(parDesBidNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.link.includes('partners'),
    'message link goes to partners page'
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    'message.actor && message.actor.id is the user'
  );
  const messageDeleted = await createNotificationMessage(parDesBidDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test(
  'notification messages returns partner reject service bid messages to the user' +
    ' if resources exist',
  async (t: tape.Test) => {
    sandbox()
      .stub(NotificationAnnouncer, 'announceNotificationCreation')
      .resolves({});
    const {
      notification: parRejSerBidNotification,
      design,
      actor
    } = await generateNotification({
      type: NotificationType.PARTNER_REJECT_SERVICE_BID
    });
    const {
      notification: parRejSerBidDeleted,
      design: parRejSerBidDesign
    } = await generateNotification({
      type: NotificationType.PARTNER_REJECT_SERVICE_BID
    });
    await DesignsDAO.deleteById(parRejSerBidDesign.id);

    const message = await createNotificationMessage(parRejSerBidNotification);
    if (!message) {
      throw new Error('Did not create message');
    }
    t.assert(
      message.html.includes(design.title),
      'message html contains the design title'
    );
    t.assert(
      message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user'
    );
    const messageDeleted = await createNotificationMessage(parRejSerBidDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource'
    );
  }
);

test('notification messages returns task assignment message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const {
    notification: tasAsnNotification,
    task,
    actor
  } = await generateNotification({
    type: NotificationType.TASK_ASSIGNMENT
  });
  const {
    notification: tasAsnDeleted,
    design: tasAsnDesign
  } = await generateNotification({
    type: NotificationType.TASK_ASSIGNMENT
  });
  await DesignsDAO.deleteById(tasAsnDesign.id);

  const message = await createNotificationMessage(tasAsnNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(task.title || 'test'),
    'message html contains the task title'
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    'message.actor && message.actor.id is the user'
  );
  const messageDeleted = await createNotificationMessage(tasAsnDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages returns task comment create message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const {
    notification: tasComCreNotification,
    task,
    actor
  } = await generateNotification({
    type: NotificationType.TASK_COMMENT_CREATE
  });
  const {
    notification: tasComCreDeleted,
    design: tasComCreDesign
  } = await generateNotification({
    type: NotificationType.TASK_COMMENT_CREATE
  });
  await DesignsDAO.deleteById(tasComCreDesign.id);

  const message = await createNotificationMessage(tasComCreNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(task.title || 'test'),
    'message html contains the task title'
  );
  const { mentions } = message.attachments[0];
  t.assert(
    mentions && Object.keys(mentions).length === 1,
    'message attachments contains one mention'
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    'message.actor && message.actor.id is the user'
  );
  const messageDeleted = await createNotificationMessage(tasComCreDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages returns task comment mention message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const {
    notification: tasComMenNotification,
    task,
    actor
  } = await generateNotification({
    type: NotificationType.TASK_COMMENT_MENTION
  });
  const {
    notification: tasComMenDeleted,
    design: tasComMenDesign
  } = await generateNotification({
    type: NotificationType.TASK_COMMENT_MENTION
  });
  await DesignsDAO.deleteById(tasComMenDesign.id);

  const message = await createNotificationMessage(tasComMenNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(task.title || 'test'),
    'message html contains the task title'
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    'message.actor && message.actor.id is the user'
  );
  const { mentions } = message.attachments[0];
  t.assert(
    mentions && Object.keys(mentions).length === 1,
    'message attachments contains one mention'
  );
  const messageDeleted = await createNotificationMessage(tasComMenDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages returns task completion message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const {
    notification: tasComNotification,
    task,
    actor
  } = await generateNotification({
    type: NotificationType.TASK_COMPLETION
  });
  const {
    notification: tasComDeleted,
    design: tasComDesign
  } = await generateNotification({
    type: NotificationType.TASK_COMPLETION
  });
  await DesignsDAO.deleteById(tasComDesign.id);

  const message = await createNotificationMessage(tasComNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(task.title || 'test'),
    'message html contains the task title'
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    'message.actor && message.actor.id is the user'
  );
  const messageDeleted = await createNotificationMessage(tasComDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages returns partner pairing committed message to the user if resources exist', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const {
    notification: parPairNotification,
    collection,
    actor
  } = await generateNotification({
    type: NotificationType.PARTNER_PAIRING_COMMITTED
  });
  const {
    notification: parPairDeleted,
    collection: parPairCollection
  } = await generateNotification({
    type: NotificationType.PARTNER_PAIRING_COMMITTED
  });
  await CollectionsDAO.deleteById(parPairCollection.id);

  const message = await createNotificationMessage(parPairNotification);
  if (!message) {
    throw new Error('Did not create message');
  }
  t.assert(
    message.html.includes(collection.title || 'Untitled'),
    'message html contains the collection title'
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    'message.actor && message.actor.id is the user'
  );
  const messageDeleted = await createNotificationMessage(parPairDeleted);
  t.assert(
    messageDeleted === null,
    'No message is created for a deleted subresource'
  );
});

test('notification messages supports costing expiration messages', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});

  const { collection } = await generateCollection({
    title: 'Testing123'
  });

  // Costing Expired Message

  const { notification: notification1 } = await generateNotification({
    collectionId: collection.id,
    type: NotificationType.COSTING_EXPIRED
  });
  const message1 = await createNotificationMessage(notification1);
  t.assert(
    message1!.html.includes(collection.title || 'Untitled'),
    'message html contains the collection title'
  );
  t.true(
    message1!.html.includes(
      'pricing has expired. Please resubmit for updated costing.'
    )
  );
  t.equal(message1!.title, 'Pricing for Testing123 has expired.');

  // Costing Expiration Two Days

  const { notification: notification2 } = await generateNotification({
    collectionId: collection.id,
    type: NotificationType.COSTING_EXPIRATION_TWO_DAYS
  });
  const message2 = await createNotificationMessage(notification2);
  t.assert(
    message2!.html.includes(collection.title || 'Untitled'),
    'message html contains the collection title'
  );
  t.true(message2!.html.includes('pricing expires in 48 hours.'));
  t.equal(message2!.title, 'Pricing for Testing123 will expire in 48 hours.');

  // Costing Expiration One Week

  const { notification: notification3 } = await generateNotification({
    collectionId: collection.id,
    type: NotificationType.COSTING_EXPIRATION_ONE_WEEK
  });
  const message3 = await createNotificationMessage(notification3);
  t.assert(
    message3!.html.includes(collection.title || 'Untitled'),
    'message html contains the collection title'
  );
  t.true(message3!.html.includes('pricing expires in 7 days.'));
  t.equal(message3!.title, 'Pricing for Testing123 will expire in 7 days.');
});

test('unsupported notifications', async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, 'announceNotificationCreation')
    .resolves({});
  const { notification } = await generateNotification({
    type: NotificationType.TASK_ASSIGNMENT
  });
  const deprecatedNotification: object = {
    ...notification,
    type: 'ANNOTATION_CREATE'
  };
  const message = await createNotificationMessage(
    deprecatedNotification as Notification
  );
  t.equal(message, null, 'A deprecated type returns null');
  const unsupportedNotification: object = {
    ...notification,
    type: 'FOO'
  };

  try {
    await createNotificationMessage(unsupportedNotification as Notification);
    t.fail(
      'Should not be able to create a notification message for an unsupported type.'
    );
  } catch (e) {
    t.equal(
      e.message,
      `Unknown notification type found with id ${notification.id} and type FOO`,
      'Throws an error for an unsupported type.'
    );
  }
});
