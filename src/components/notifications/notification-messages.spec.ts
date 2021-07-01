import tape from "tape";
import Knex from "knex";

import db from "../../services/db";
import { sandbox, test } from "../../test-helpers/fresh";
import createUser from "../../test-helpers/create-user";

import * as CollectionsDAO from "../collections/dao";
import * as TaskEventsDAO from "../../dao/task-events";
import * as MeasurementsDAO from "../../dao/product-design-canvas-measurements";
import * as CollaboratorsDAO from "../collaborators/dao";
import * as CommentAttachmentDAO from "../comment-attachments/dao";
import * as PlansDAO from "../../components/plans/dao";
import generateNotification from "../../test-helpers/factories/notification";
import {
  createNotificationMessage,
  getNonUserInvitationMessage,
} from "./notification-messages";
import { STUDIO_HOST } from "../../config";
import { FullNotification, NotificationType } from "./domain-object";
import generateCollection from "../../test-helpers/factories/collection";
import * as NotificationAnnouncer from "../iris/messages/notification";
import { deleteById } from "../../test-helpers/designs";
import { findByUserId, update, findById } from "./dao";
import generateAsset from "../../test-helpers/factories/asset";
import generateApprovalSubmission from "../../test-helpers/factories/design-approval-submission";
import { registerMessageBuilders } from "../cala-components";
import { generateTeam } from "../../test-helpers/factories/team";
import { generateDesign } from "../../test-helpers/factories/product-design";
import generateComment from "../../test-helpers/factories/comment";

registerMessageBuilders();

test("annotation comment notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const userOne = await createUser();

  const { collection } = await generateCollection({
    createdBy: userOne.user.id,
    title: "test",
  });

  const { design, actor, collaborator } = await generateNotification({
    collectionId: collection.id,
    recipientUserId: userOne.user.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await CollaboratorsDAO.update(collaborator.id, {
    ...collaborator,
    cancelledAt: new Date(),
  });
  const { design: annCommCreateDesign } = await generateNotification({
    recipientUserId: userOne.user.id,
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await deleteById(annCommCreateDesign.id);

  const { comment } = await generateNotification({
    recipientUserId: userOne.user.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });

  const asset1 = (await generateAsset()).asset;
  const asset2 = (await generateAsset()).asset;
  await db.transaction(async (trx: Knex.Transaction) => {
    await CommentAttachmentDAO.createAll(trx, [
      {
        assetId: asset1.id,
        commentId: comment.id,
      },
      {
        assetId: asset2.id,
        commentId: comment.id,
      },
    ]);
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, userOne.user.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 2);
  const annCommCreateDesignNotification = notifications[1];

  const annCommCreateMessage = await createNotificationMessage(
    annCommCreateDesignNotification
  );
  if (!annCommCreateMessage) {
    throw new Error("Did not create message");
  }
  t.assert(
    annCommCreateMessage.html.includes(design.title || "test"),
    "message html contains the design title"
  );
  t.assert(
    annCommCreateMessage.text.includes(design.title || "test"),
    "message text contains the design title"
  );
  t.assert(
    annCommCreateMessage.actor && annCommCreateMessage.actor.id === actor.id,
    "message actor is the user"
  );
  const { mentions, hasAttachments } = annCommCreateMessage.attachments[0];
  t.is(
    Object.keys(mentions!).length,
    1,
    "message attachments contains one mention"
  );
  t.is(hasAttachments, false, "Notification does not have attachments");
  const {
    designId,
    parentCommentId,
    commentId,
  } = annCommCreateMessage.actions[0];
  t.is(designId, design.id, "action contains design ID");
  t.is(
    parentCommentId,
    annCommCreateDesignNotification.commentId,
    "action contains parent comment id"
  );
  t.is(
    commentId,
    annCommCreateDesignNotification.commentId,
    "action contains comment id"
  );

  const notificationWithAttachment = notifications[0];
  const withAttachmentsMessage = await createNotificationMessage(
    notificationWithAttachment
  );
  if (!withAttachmentsMessage) {
    throw new Error("Did not create message");
  }
  t.true(
    withAttachmentsMessage.attachments[0].hasAttachments,
    "Notification has attachments"
  );
});

test("annotation mention notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { design, actor, recipient } = await generateNotification({
    type: NotificationType.ANNOTATION_COMMENT_MENTION,
  });
  const { design: annMenDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.ANNOTATION_COMMENT_MENTION,
  });
  await deleteById(annMenDesign.id);

  const { comment } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.ANNOTATION_COMMENT_MENTION,
  });
  const asset1 = (await generateAsset()).asset;
  const asset2 = (await generateAsset()).asset;
  await db.transaction(async (trx: Knex.Transaction) => {
    await CommentAttachmentDAO.createAll(trx, [
      {
        assetId: asset1.id,
        commentId: comment.id,
      },
      {
        assetId: asset2.id,
        commentId: comment.id,
      },
    ]);
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 2);
  const annMenNotification = notifications[1];

  const message = await createNotificationMessage(annMenNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(design.title || "test"),
    "message html contains the design title"
  );
  t.assert(
    message.text.includes(design.title || "test"),
    "message text contains the design title"
  );
  t.assert(message.actor && message.actor.id === actor.id, "actor is correct");
  const { mentions, hasAttachments } = message.attachments[0];
  t.assert(
    mentions && Object.keys(mentions).length === 1,
    "message attachments contains one mention"
  );
  t.is(hasAttachments, false, "Notification does not have attachments");
  const { designId } = message.actions[0];
  t.is(designId, design.id, "action contains design ID");

  const notificationWithAttachment = notifications[0];
  const withAttachmentsMessage = await createNotificationMessage(
    notificationWithAttachment
  );
  if (!withAttachmentsMessage) {
    throw new Error("Did not create message");
  }
  t.true(
    withAttachmentsMessage.attachments[0].hasAttachments,
    "Notification has attachments"
  );
});

test("collection submit notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const userOne = await createUser();

  const { collection } = await generateCollection({
    createdBy: userOne.user.id,
    title: "test",
  });

  const { recipient } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.COLLECTION_SUBMIT,
  });
  const { collection: delCollection } = await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: recipient.id,
    type: NotificationType.COLLECTION_SUBMIT,
  });

  const notifications = await db.transaction(async (trx: Knex.Transaction) => {
    await CollectionsDAO.deleteById(trx, delCollection.id);
    return findByUserId(trx, recipient.id, { limit: 20, offset: 0 });
  });

  t.is(notifications.length, 1);
  const collSubNotification = notifications[0];
  const message = await createNotificationMessage(collSubNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(collection.title || "test"),
    "message html contains the collection title"
  );
  t.assert(
    message.text.includes(collection.title || "test"),
    "message text contains the collection title"
  );
  t.assert(
    message.actor && message.actor.id === userOne.user.id,
    "message.actor && message.actor.id is the user"
  );
  t.assert(
    message.html.indexOf(
      `<a href="${STUDIO_HOST}/collections/${collection.id}/designs">`
    ) !== -1,
    "message link goes to correct collection"
  );
});

test("commit cost inputs notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const userOne = await createUser();
  const { collection } = await generateCollection({
    createdBy: userOne.user.id,
    title: "test collection",
  });

  const { recipient } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.COMMIT_COST_INPUTS,
  });
  const { collection: delCollection } = await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: recipient.id,
    type: NotificationType.COMMIT_COST_INPUTS,
  });
  const notifications = await db.transaction(async (trx: Knex.Transaction) => {
    await CollectionsDAO.deleteById(trx, delCollection.id);
    return findByUserId(trx, recipient.id, { limit: 20, offset: 0 });
  });

  t.is(notifications.length, 1);
  const comCosInpNotification = notifications[0];
  const message = await createNotificationMessage(comCosInpNotification);
  if (!message) {
    throw new Error("Did not create message");
  }

  t.assert(
    message.html.includes("test collection"),
    "message html contains the collection title"
  );
  t.assert(
    message.text.includes("test collection"),
    "message text contains the collection title"
  );
  t.assert(
    message.actor && message.actor.id === userOne.user.id,
    "message.actor && message.actor.id is the user"
  );
  t.assert(
    message.html.indexOf(
      `<a href="${STUDIO_HOST}/collections/${collection.id}/designs?isCheckout=true">`
    ) !== -1,
    "message link goes to correct collection"
  );
});

test("invite existing-user collaborator notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const userOne = await createUser();

  const { collection } = await generateCollection({
    createdBy: userOne.user.id,
    title: "test collection",
  });

  const { recipient, notification } = await generateNotification({
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.INVITE_COLLABORATOR,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await update(trx, notification.id, { recipientUserId: recipient.id });
    return findById(trx, notification.id);
  });

  const { design: invColDesign } = await generateNotification({
    actorUserId: userOne.user.id,
    recipientUserId: recipient.id,
    collectionId: collection.id,
    type: NotificationType.INVITE_COLLABORATOR,
  });
  await deleteById(invColDesign.id);

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 1);
  const invColNotification = notifications[0];
  const message = await createNotificationMessage(invColNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes("test collection"),
    "message html contains the collection title"
  );
  t.assert(
    message.actor && message.actor.id === userOne.user.id,
    "message.actor && message.actor.id is the user"
  );
  t.assert(
    message.html.indexOf(
      `<a href="${STUDIO_HOST}/collections/${collection.id}/designs">`
    ) !== -1,
    "message link goes to correct collection"
  );
});

test("invite non-user collaborator notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  sandbox().stub(PlansDAO, "findFreeAndDefaultForTeams").resolves({
    id: "plan-1",
  });

  const { collaborator, design, notification } = await generateNotification({
    type: NotificationType.INVITE_COLLABORATOR,
  });

  if (!notification) {
    throw new Error("Missing notification");
  }

  await CollaboratorsDAO.update(collaborator.id, {
    userId: null,
    userEmail: "foo@example.com",
  });

  const message = await createNotificationMessage(notification);

  if (!message) {
    throw new Error("Did not create message");
  }

  const href = message.html.match(/href="(.+)"/)![1];

  t.equal(
    href,
    `${STUDIO_HOST}/subscribe?planId=plan-1&invitationEmail=foo%40example.com&returnTo=%2Fdesigns%2F${design.id}`,
    "message link goes to correct collection"
  );
});

test("measurement create notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { design, actor, recipient } = await generateNotification({
    type: NotificationType.MEASUREMENT_CREATE,
  });
  const { measurement: meaCreMeasurement } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.MEASUREMENT_CREATE,
  });
  await MeasurementsDAO.deleteById(meaCreMeasurement.id);

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 1);
  const meaCreNotification = notifications[0];
  const message = await createNotificationMessage(meaCreNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(design.title || "test"),
    "message html contains the design title"
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    "message.actor && message.actor.id is the user"
  );
});

test("partner accept service bid notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { design, actor, recipient } = await generateNotification({
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });
  const { design: parAccSerBidDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });
  await deleteById(parAccSerBidDesign.id);

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 1);
  const parAccSerBidNotification = notifications[0];
  const message = await createNotificationMessage(parAccSerBidNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(design.title),
    "message html contains the design title"
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    "message.actor && message.actor.id is the user"
  );
});

test("partner design bid notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { actor, recipient } = await generateNotification({
    type: NotificationType.PARTNER_DESIGN_BID,
  });
  const { design: parDesBidDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.PARTNER_DESIGN_BID,
  });
  await deleteById(parDesBidDesign.id);

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 1);
  const parDesBidNotification = notifications[0];
  const message = await createNotificationMessage(parDesBidNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.link.includes("partners"),
    "message link goes to partners page"
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    "message.actor && message.actor.id is the user"
  );
});

test("partner reject service bid notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { design, actor, recipient } = await generateNotification({
    type: NotificationType.PARTNER_REJECT_SERVICE_BID,
  });
  const { design: parRejSerBidDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.PARTNER_REJECT_SERVICE_BID,
  });
  await deleteById(parRejSerBidDesign.id);

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 1);
  const parRejSerBidNotification = notifications[0];
  const message = await createNotificationMessage(parRejSerBidNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(design.title),
    "message html contains the design title"
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    "message.actor && message.actor.id is the user"
  );
});

test("task assignment notification message", async (t: tape.Test) => {
  const testDate = new Date(2012, 11, 25);
  const clock = sandbox().useFakeTimers(testDate);
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { task, actor, recipient } = await generateNotification({
    type: NotificationType.TASK_ASSIGNMENT,
  });
  await TaskEventsDAO.create({
    dueDate: task.dueDate,
    status: task.status,
    description: task.description,
    createdBy: task.createdBy,
    title: "First change",
    taskId: task.id,
    designStageId: task.designStageId,
    ordering: task.ordering,
  });
  clock.tick(1000);
  await TaskEventsDAO.create({
    dueDate: task.dueDate,
    status: task.status,
    description: task.description,
    createdBy: task.createdBy,
    title: "I have changed",
    taskId: task.id,
    designStageId: task.designStageId,
    ordering: task.ordering,
  });
  const { design: tasAsnDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.TASK_ASSIGNMENT,
  });
  await deleteById(tasAsnDesign.id);

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 1);
  const tasAsnNotification = notifications[0];
  const message = await createNotificationMessage(tasAsnNotification);
  if (!message) {
    throw new Error("Did not create message");
  }

  t.assert(
    message.actor && message.actor.id === actor.id,
    "message.actor && message.actor.id is the user"
  );
});

test("task comment create notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { task, actor, recipient, design } = await generateNotification({
    type: NotificationType.TASK_COMMENT_CREATE,
  });
  const { design: tasComCreDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.TASK_COMMENT_CREATE,
  });
  await deleteById(tasComCreDesign.id);

  const { comment } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.TASK_COMMENT_CREATE,
  });
  const asset1 = (await generateAsset()).asset;
  const asset2 = (await generateAsset()).asset;
  await db.transaction(async (trx: Knex.Transaction) => {
    await CommentAttachmentDAO.createAll(trx, [
      {
        assetId: asset1.id,
        commentId: comment.id,
      },
      {
        assetId: asset2.id,
        commentId: comment.id,
      },
    ]);
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 2);
  const tasComCreNotification = notifications[1];
  const message = await createNotificationMessage(tasComCreNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(task.title || "test"),
    "message html contains the task title"
  );
  const { mentions, hasAttachments } = message.attachments[0];
  t.assert(
    mentions && Object.keys(mentions).length === 1,
    "message attachments contains one mention"
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    "message.actor && message.actor.id is the user"
  );
  const { designId } = message.actions[0];
  t.is(hasAttachments, false, "Notification does not have attachments");
  t.is(designId, design.id, "action contains design ID");

  const notificationWithAttachment = notifications[0];
  const withAttachmentsMessage = await createNotificationMessage(
    notificationWithAttachment
  );
  if (!withAttachmentsMessage) {
    throw new Error("Did not create message");
  }
  t.true(
    withAttachmentsMessage.attachments[0].hasAttachments,
    "Notification has attachments"
  );
});

test("task comment mention notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { task, actor, recipient, design } = await generateNotification({
    type: NotificationType.TASK_COMMENT_MENTION,
  });
  const { design: tasComMenDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.TASK_COMMENT_MENTION,
  });
  await deleteById(tasComMenDesign.id);

  const { comment } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.TASK_COMMENT_MENTION,
  });
  const asset1 = (await generateAsset()).asset;
  const asset2 = (await generateAsset()).asset;
  await db.transaction(async (trx: Knex.Transaction) => {
    await CommentAttachmentDAO.createAll(trx, [
      {
        assetId: asset1.id,
        commentId: comment.id,
      },
      {
        assetId: asset2.id,
        commentId: comment.id,
      },
    ]);
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 2);
  const tasComMenNotification = notifications[1];
  const message = await createNotificationMessage(tasComMenNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(task.title || "test"),
    "message html contains the task title"
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    "message.actor && message.actor.id is the user"
  );
  const { mentions, hasAttachments } = message.attachments[0];
  t.assert(
    mentions && Object.keys(mentions).length === 1,
    "message attachments contains one mention"
  );
  const { designId } = message.actions[0];
  t.is(hasAttachments, false, "Notification does not have attachments");
  t.is(designId, design.id, "action contains design ID");

  const notificationWithAttachment = notifications[0];
  const withAttachmentsMessage = await createNotificationMessage(
    notificationWithAttachment
  );
  if (!withAttachmentsMessage) {
    throw new Error("Did not create message");
  }
  t.true(
    withAttachmentsMessage.attachments[0].hasAttachments,
    "Notification has attachments"
  );
});

test("task completion notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { task, actor, recipient } = await generateNotification({
    type: NotificationType.TASK_COMPLETION,
  });
  const { design: tasComDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.TASK_COMPLETION,
  });
  await deleteById(tasComDesign.id);

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 1);
  const tasComNotification = notifications[0];
  const message = await createNotificationMessage(tasComNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(task.title || "test"),
    "message html contains the task title"
  );
  t.assert(
    message.actor && message.actor.id === actor.id,
    "message.actor && message.actor.id is the user"
  );
});

test("costing expiration notification messages", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const { collection } = await generateCollection({
    title: "Testing123",
  });

  const { recipient } = await generateNotification({
    collectionId: collection.id,
    type: NotificationType.COSTING_EXPIRED,
  });
  await generateNotification({
    collectionId: collection.id,
    recipientUserId: recipient.id,
    type: NotificationType.COSTING_EXPIRATION_TWO_DAYS,
  });
  await generateNotification({
    collectionId: collection.id,
    recipientUserId: recipient.id,
    type: NotificationType.COSTING_EXPIRATION_ONE_WEEK,
  });
  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  // Costing Expired Message

  const message1 = await createNotificationMessage(notifications[2]);
  t.assert(
    message1!.html.includes(collection.title || "Untitled"),
    "message html contains the collection title"
  );
  t.true(
    message1!.html.includes(
      "pricing has expired. Please resubmit for updated costing."
    )
  );
  t.equal(message1!.title, "Pricing for Testing123 has expired");

  // Costing Expiration Two Days

  const message2 = await createNotificationMessage(notifications[1]);
  t.assert(
    message2!.html.includes(collection.title || "Untitled"),
    "message html contains the collection title"
  );
  t.true(message2!.html.includes("pricing expires in 48 hours"));
  t.equal(message2!.title, "Pricing for Testing123 will expire in 48 hours");

  // Costing Expiration One Week

  const message3 = await createNotificationMessage(notifications[0]);
  t.assert(
    message3!.html.includes(collection.title || "Untitled"),
    "message html contains the collection title"
  );
  t.true(message3!.html.includes("pricing expires in 7 days"));
  t.equal(message3!.title, "Pricing for Testing123 will expire in 7 days");
});

test("unsupported notifications", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const deprecatedNotification = {
    id: "deprecated",
    type: "ANNOTATION_CREATE",
  };
  const message = await createNotificationMessage(
    deprecatedNotification as FullNotification
  );
  t.equal(message, null, "A deprecated type returns null");
  const unsupportedNotification = {
    id: "invalid",
    type: "FOO",
  };

  try {
    await createNotificationMessage(
      unsupportedNotification as FullNotification
    );
    t.fail(
      "Should not be able to create a notification message for an unsupported type."
    );
  } catch (e) {
    t.equal(
      e.message,
      `Unknown notification type found with id invalid and type FOO`,
      "Throws an error for an unsupported type."
    );
  }
});

test("approval step mention notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { design, actor, recipient, approvalStep } = await generateNotification(
    {
      type: NotificationType.APPROVAL_STEP_COMMENT_MENTION,
    }
  );
  const { design: mentionDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.APPROVAL_STEP_COMMENT_MENTION,
  });
  await deleteById(mentionDesign.id);

  const { comment } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.APPROVAL_STEP_COMMENT_MENTION,
  });
  const asset1 = (await generateAsset()).asset;
  const asset2 = (await generateAsset()).asset;
  await db.transaction(async (trx: Knex.Transaction) => {
    await CommentAttachmentDAO.createAll(trx, [
      {
        assetId: asset1.id,
        commentId: comment.id,
      },
      {
        assetId: asset2.id,
        commentId: comment.id,
      },
    ]);
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 2);
  const annMenNotification = notifications[1];

  const message = await createNotificationMessage(annMenNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(design.title),
    "message html contains the design title"
  );
  t.assert(
    message.html.includes(approvalStep.title),
    "message html contains the step title"
  );
  t.assert(message.actor && message.actor.id === actor.id, "actor is correct");
  const { mentions, hasAttachments } = message.attachments[0];
  t.assert(
    mentions && Object.keys(mentions).length === 1,
    "message attachments contains one mention"
  );
  t.is(hasAttachments, false, "Notification does not have attachments");
  const { designId } = message.actions[0];
  t.is(designId, design.id, "action contains design ID");

  const notificationWithAttachment = notifications[0];
  const withAttachmentsMessage = await createNotificationMessage(
    notificationWithAttachment
  );
  if (!withAttachmentsMessage) {
    throw new Error("Did not create message");
  }
  t.true(
    withAttachmentsMessage.attachments[0].hasAttachments,
    "Notification has attachments"
  );
});

test("approval step reply notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const { comment: parentComment } = await generateComment();
  const { comment } = await generateComment({
    parentCommentId: parentComment.id,
  });
  const { design, actor, recipient, approvalStep } = await generateNotification(
    {
      commentId: comment.id,

      type: NotificationType.APPROVAL_STEP_COMMENT_REPLY,
    }
  );
  const { design: mentionDesign } = await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.APPROVAL_STEP_COMMENT_REPLY,
  });
  await deleteById(mentionDesign.id);

  await generateNotification({
    recipientUserId: recipient.id,
    type: NotificationType.APPROVAL_STEP_COMMENT_REPLY,
  });
  const asset1 = (await generateAsset()).asset;
  const asset2 = (await generateAsset()).asset;
  await db.transaction(async (trx: Knex.Transaction) => {
    await CommentAttachmentDAO.createAll(trx, [
      {
        assetId: asset1.id,
        commentId: comment.id,
      },
      {
        assetId: asset2.id,
        commentId: comment.id,
      },
    ]);
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, recipient.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 2);
  const annMenNotification = notifications[1];

  const message = await createNotificationMessage(annMenNotification);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(design.title),
    "message html contains the design title"
  );
  t.assert(
    message.html.includes(approvalStep.title),
    "message html contains the step title"
  );
  t.assert(message.actor && message.actor.id === actor.id, "actor is correct");
  const { hasAttachments } = message.attachments[0];
  t.true(hasAttachments, "Notification has attachments");
  const { designId, parentCommentId, commentId } = message.actions[0];
  t.is(designId, design.id, "action contains design ID");
  t.is(parentCommentId, parentComment.id, "action contains parent comment id");
  t.is(commentId, comment.id, "action contains comment id");
  const notificationWithAttachment = notifications[0];
  const withoutAttachmentsMessage = await createNotificationMessage(
    notificationWithAttachment
  );
  if (!withoutAttachmentsMessage) {
    throw new Error("Did not create message");
  }
  t.false(
    withoutAttachmentsMessage.attachments[0].hasAttachments,
    "Notification has no attachments"
  );
});

test("approval comment notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const userOne = await createUser();

  const {
    design,
    actor,
    collaborator,
    collection,
  } = await generateNotification({
    recipientUserId: userOne.user.id,
    type: NotificationType.APPROVAL_STEP_COMMENT_CREATE,
  });
  await CollaboratorsDAO.update(collaborator.id, {
    ...collaborator,
    cancelledAt: new Date(),
  });
  const { design: annCommCreateDesign } = await generateNotification({
    recipientUserId: userOne.user.id,
    actorUserId: userOne.user.id,
    collectionId: collection.id,
    type: NotificationType.APPROVAL_STEP_COMMENT_CREATE,
  });
  await deleteById(annCommCreateDesign.id);

  const { comment } = await generateNotification({
    recipientUserId: userOne.user.id,
    type: NotificationType.APPROVAL_STEP_COMMENT_CREATE,
  });

  const asset1 = (await generateAsset()).asset;
  const asset2 = (await generateAsset()).asset;
  await db.transaction(async (trx: Knex.Transaction) => {
    await CommentAttachmentDAO.createAll(trx, [
      {
        assetId: asset1.id,
        commentId: comment.id,
      },
      {
        assetId: asset2.id,
        commentId: comment.id,
      },
    ]);
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, userOne.user.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 2);
  const annCommCreateDesignNotification = notifications[1];

  const annCommCreateMessage = await createNotificationMessage(
    annCommCreateDesignNotification
  );
  if (!annCommCreateMessage) {
    throw new Error("Did not create message");
  }
  t.assert(
    annCommCreateMessage.html.includes(design.title || "test"),
    "message html contains the design title"
  );
  t.assert(
    annCommCreateMessage.actor && annCommCreateMessage.actor.id === actor.id,
    "message actor is the user"
  );
  const { mentions, hasAttachments } = annCommCreateMessage.attachments[0];
  t.is(
    Object.keys(mentions!).length,
    1,
    "message attachments contains one mention"
  );
  t.is(hasAttachments, false, "Notification does not have attachments");
  const { designId } = annCommCreateMessage.actions[0];
  t.is(designId, design.id, "action contains design ID");

  const notificationWithAttachment = notifications[0];
  const withAttachmentsMessage = await createNotificationMessage(
    notificationWithAttachment
  );
  if (!withAttachmentsMessage) {
    throw new Error("Did not create message");
  }
  t.true(
    withAttachmentsMessage.attachments[0].hasAttachments,
    "Notification has attachments"
  );
});

test("submission assignment notification message", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { user } = await createUser();

  const { submission } = await db.transaction(async (trx: Knex.Transaction) =>
    generateApprovalSubmission(trx, {
      title: "Technical design",
    })
  );

  const { design } = await generateNotification({
    recipientUserId: user.id,
    type: NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT,
    approvalSubmissionId: submission.id,
  });
  const notifications = await db.transaction((trx: Knex.Transaction) =>
    findByUserId(trx, user.id, { limit: 20, offset: 0 })
  );

  t.is(notifications.length, 1);

  const message = await createNotificationMessage(notifications[0]);
  if (!message) {
    throw new Error("Did not create message");
  }
  t.assert(
    message.html.includes(design.title || "test"),
    "message html contains the design title"
  );
  t.assert(
    message.html.includes(submission.title),
    "message html contains submission title"
  );
});

test("getNonUserInvitationMessage for collection collaborator", async (t: tape.Test) => {
  sandbox().stub(PlansDAO, "findFreeAndDefaultForTeams").resolves({
    id: "plan-1",
  });
  const { collection } = await generateCollection();
  const { notification: collectionNotification } = await generateNotification({
    type: NotificationType.INVITE_COLLABORATOR,
    collectionId: collection.id,
    designId: null,
    teamId: null,
  });
  const message = await getNonUserInvitationMessage({
    notification: collectionNotification,
    invitationEmail: "example@example.com",
    escapedActorName: "Nameo",
    resourceName: "Drop 2021",
  });

  [
    "Nameo",
    " invited you to collaborate on ",
    "Drop 2021",
  ].forEach((part: string) =>
    t.assert(message.html.includes(part), `Message contains "${part}"`)
  );
});

test("getNonUserInvitationMessage for design collaborator", async (t: tape.Test) => {
  sandbox().stub(PlansDAO, "findFreeAndDefaultForTeams").resolves({
    id: "plan-1",
  });
  const { user } = await createUser();
  const design = await generateDesign({ userId: user.id });
  const { notification: collectionNotification } = await generateNotification({
    type: NotificationType.INVITE_COLLABORATOR,
    collectionId: null,
    designId: design.id,
    teamId: null,
  });
  const message = await getNonUserInvitationMessage({
    notification: collectionNotification,
    invitationEmail: "example@example.com",
    escapedActorName: "Nameo",
    resourceName: "Hat",
  });

  ["Nameo", " invited you to collaborate on ", "Hat"].forEach((part: string) =>
    t.assert(message.html.includes(part), `Message contains "${part}"`)
  );
});

test("getNonUserInvitationMessage for team user", async (t: tape.Test) => {
  sandbox().stub(PlansDAO, "findFreeAndDefaultForTeams").resolves({
    id: "plan-1",
  });
  const { user } = await createUser();
  const { team, teamUser } = await generateTeam(user.id);
  const { notification: collectionNotification } = await generateNotification({
    type: NotificationType.INVITE_TEAM_USER,
    collectionId: null,
    designId: null,
    teamId: team.id,
    recipientTeamUserId: teamUser.id,
  });
  const message = await getNonUserInvitationMessage({
    notification: collectionNotification,
    invitationEmail: "example@example.com",
    escapedActorName: "Nameo",
    resourceName: "The Team",
  });

  ["Nameo", " invited you to ", "The Team"].forEach((part: string) =>
    t.assert(message.html.includes(part), `Message contains "${part}"`)
  );
  t.assert(
    !message.html.includes("collaborate on"),
    "team invite email does not include collaborate"
  );
});
