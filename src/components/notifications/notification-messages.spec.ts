import * as tape from 'tape';

import { test } from '../../test-helpers/fresh';
import createUser = require('../../test-helpers/create-user');

import * as CollectionsDAO from '../../dao/collections';
import * as DesignsDAO from '../../dao/product-designs';
import generateNotification from '../../test-helpers/factories/notification';
import { createNotificationMessage } from './notification-messages';
import { STUDIO_HOST } from '../../config';
import { NotificationType } from './domain-object';
import generateCollection from '../../test-helpers/factories/collection';

test('notification messages returns annotation comment create message to the user'
  + ' if resources exist',
  async (t: tape.Test) => {
    const userOne = await createUser();

    const { collection } = await generateCollection({ createdBy: userOne.user.id, title: 'test' });
    if (!collection) { throw new Error('Could not create collection'); }

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

    const annCommCreateMessage = await createNotificationMessage(annCommCreateDesignNotification);
    if (!annCommCreateMessage) { throw new Error('Did not create message'); }
    t.assert(annCommCreateMessage.html.includes(design.title || 'test'),
      'message html contains the design title');
    t.assert(annCommCreateMessage.actor && annCommCreateMessage.actor.id === actor.id,
      'message actor is the user');
    const annCommCreateDeletedMessage = await createNotificationMessage(annCommCreateDesignDeleted);
    t.assert(
      annCommCreateDeletedMessage === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns annotation mention message to the user if resources exist',
  async (t: tape.Test) => {
    const { notification: annMenNotification, design, actor } = await generateNotification({
      type: NotificationType.ANNOTATION_COMMENT_MENTION
    });
    const { notification: annMenDeleted, design: annMenDesign } = await generateNotification({
      type: NotificationType.ANNOTATION_COMMENT_MENTION
    });
    await DesignsDAO.deleteById(annMenDesign.id);

    const message = await createNotificationMessage(annMenNotification);
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(design.title || 'test'),
      'message html contains the design title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(annMenDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns collection submit message to the user if resources exist',
  async (t: tape.Test) => {
    const userOne = await createUser();

    const { collection } = await generateCollection({ createdBy: userOne.user.id, title: 'test' });
    if (!collection) { throw new Error('Could not create collection'); }

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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(collection.title || 'test'),
      'message html contains the collection title');
    t.assert(message.actor && message.actor.id === userOne.user.id,
      'message.actor && message.actor.id is the user');
    t.assert(message.html
      .indexOf(`<a href="${STUDIO_HOST}/collections/${collection.id}">`) !== -1,
      'message link goes to correct collection');
    await CollectionsDAO.deleteById(collection.id);
    const messageDeleted = await createNotificationMessage(collSubDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns commit cost inputs message to the user if resources exist',
  async (t: tape.Test) => {
    const userOne = await createUser();

    const { collection } = await generateCollection({ createdBy: userOne.user.id, title: 'test' });
    if (!collection) { throw new Error('Could not create collection'); }

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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(collection.title || 'test'),
      'message html contains the collection title');
    t.assert(message.actor && message.actor.id === userOne.user.id,
      'message.actor && message.actor.id is the user');
    t.assert(message.html
      .indexOf(`<a href="${STUDIO_HOST}/collections/${collection.id}?isCheckout=true">`) !== -1,
      'message link goes to correct collection');
    await CollectionsDAO.deleteById(collection.id);
    const messageDeleted = await createNotificationMessage(comCosInpDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns invite collaborator message to the user if resources exist',
  async (t: tape.Test) => {
    const userOne = await createUser();

    const { collection } = await generateCollection({ createdBy: userOne.user.id, title: 'test' });
    if (!collection) { throw new Error('Could not create collection'); }

    const { notification: invColNotification } = await generateNotification({
      actorUserId: userOne.user.id,
      collectionId: collection.id,
      type: NotificationType.INVITE_COLLABORATOR
    });
    const { notification: invColDeleted, design: invColDesign } = await generateNotification({
      actorUserId: userOne.user.id,
      collectionId: collection.id,
      type: NotificationType.INVITE_COLLABORATOR
    });
    await DesignsDAO.deleteById(invColDesign.id);

    const message = await createNotificationMessage(invColNotification);
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(collection.title || 'test'),
      'message html contains the collection title');
    t.assert(message.actor && message.actor.id === userOne.user.id,
      'message.actor && message.actor.id is the user');
    t.assert(message.html
      .indexOf(`<a href="${STUDIO_HOST}/collections/${collection.id}">`) !== -1,
      'message link goes to correct collection');
    await CollectionsDAO.deleteById(collection.id);
    const messageDeleted = await createNotificationMessage(invColDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns measurement create message to the user if resources exist',
  async (t: tape.Test) => {
    const { notification: meaCreNotification, design, actor } = await generateNotification({
      type: NotificationType.MEASUREMENT_CREATE
    });
    const { notification: meaCreDeleted, design: meaCreDesign } = await generateNotification({
      type: NotificationType.MEASUREMENT_CREATE
    });
    await DesignsDAO.deleteById(meaCreDesign.id);

    const message = await createNotificationMessage(meaCreNotification);
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(design.title || 'test'),
      'message html contains the design title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(meaCreDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns partner accept service bid message to the user'
  + ' if resources exist',
  async (t: tape.Test) => {
    const { notification: parAccSerBidNotification, design, actor } = await generateNotification({
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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(design.title),
      'message html contains the design title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(parAccSerBidDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns partner design bid message to the user if resources exist',
  async (t: tape.Test) => {
    const { notification: parDesBidNotification, design, actor } = await generateNotification({
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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(design.title),
      'message html contains the design title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(parDesBidDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns partner reject service bid messages to the user'
  + ' if resources exist',
  async (t: tape.Test) => {
    const { notification: parRejSerBidNotification, design, actor } = await generateNotification({
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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(design.title),
      'message html contains the design title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(parRejSerBidDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns task assignment message to the user if resources exist',
  async (t: tape.Test) => {
    const { notification: tasAsnNotification, task, actor } = await generateNotification({
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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(task.title || 'test'),
      'message html contains the task title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(tasAsnDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns task comment create message to the user if resources exist',
  async (t: tape.Test) => {
    const { notification: tasComCreNotification, task, actor } = await generateNotification({
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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(task.title || 'test'),
      'message html contains the task title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(tasComCreDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns task comment mention message to the user if resources exist',
  async (t: tape.Test) => {
    const { notification: tasComMenNotification, task, actor } = await generateNotification({
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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(task.title || 'test'),
      'message html contains the task title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(tasComMenDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });

test('notification messages returns task completion message to the user if resources exist',
  async (t: tape.Test) => {
    const { notification: tasComNotification, task, actor } = await generateNotification({
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
    if (!message) { throw new Error('Did not create message'); }
    t.assert(message.html.includes(task.title || 'test'),
      'message html contains the task title');
    t.assert(message.actor && message.actor.id === actor.id,
      'message.actor && message.actor.id is the user');
    const messageDeleted = await createNotificationMessage(tasComDeleted);
    t.assert(
      messageDeleted === null,
      'No message is created for a deleted subresource');
  });
