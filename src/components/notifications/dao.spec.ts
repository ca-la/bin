import Knex from "knex";
import tape from "tape";
import uuid from "node-uuid";
import { sandbox, test } from "../../test-helpers/fresh";
import * as NotificationsDAO from "./dao";
import DesignsDAO from "../product-designs/dao";
import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import { Notification, NotificationType } from "./domain-object";
import generateNotification, {
  generateNotifications,
} from "../../test-helpers/factories/notification";
import generateCollection from "../../test-helpers/factories/collection";
import { InviteCollaboratorNotification } from "./models/invite-collaborator";
import { PartnerAcceptServiceBidNotification } from "./models/partner-accept-service-bid";
import { templateNotification } from "./models/base";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import * as NotificationAnnouncer from "../iris/messages/notification";
import * as CollectionsDAO from "../collections/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import * as AnnotationsDAO from "../../components/product-design-canvas-annotations/dao";
import * as CanvasesDAO from "../canvases/dao";
import * as ComponentsDAO from "../components/dao";
import * as CommentsDAO from "../../components/comments/dao";
import * as MeasurementsDAO from "../../dao/product-design-canvas-measurements";
import * as ProductDesignOptionsDAO from "../../dao/product-design-options";
import { deleteById } from "../../test-helpers/designs";
import { deleteByIds } from "../product-designs/dao/dao";
import generateTask from "../../test-helpers/factories/task";
import generateProductDesignStage from "../../test-helpers/factories/product-design-stage";
import generateComment from "../../test-helpers/factories/comment";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import { ComponentType } from "../components/domain-object";
import generateAsset from "../../test-helpers/factories/asset";
import generateApprovalSubmission from "../../test-helpers/factories/design-approval-submission";
import { NotificationFilter } from "./types";

test("Notifications DAO supports creation", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: userOne.id });
  const { collaborator: c1 } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: userTwo.id,
  });
  const data: InviteCollaboratorNotification = {
    ...templateNotification,
    actorUserId: userOne.id,
    collaboratorId: c1.id,
    collectionId: collection.id,
    createdAt: new Date(),
    designId: null,
    id: uuid.v4(),
    recipientUserId: userTwo.id,
    sentEmailAt: new Date(),
    type: NotificationType.INVITE_COLLABORATOR,
  };

  return db.transaction(async (trx: Knex.Transaction) => {
    const inserted = await NotificationsDAO.create(data);
    const result = await NotificationsDAO.findById(trx, inserted.id);
    t.deepEqual(result, inserted, "Returned the inserted notification");
  });
});

test("Notifications DAO supports finding by user id", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });

  const d1 = await DesignsDAO.create({
    productType: "HOODIE",
    title: "Raf Simons x Sterling Ruby Hoodie",
    userId: userOne.id,
  });
  const { collaborator: c1 } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: userTwo.id,
  });
  const { collaborator: c2 } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: "",
    role: "EDIT",
    userEmail: "raf@rafsimons.com",
    userId: null,
  });
  await generateNotification({
    actorUserId: userOne.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });
  const {
    notification: n2,
    collection: col,
    design: d,
  } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: c1.userId,
    collaboratorId: c1.id,
    type: NotificationType.INVITE_COLLABORATOR,
  });
  await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: c2.userId,
    collaboratorId: c2.id,
    type: NotificationType.INVITE_COLLABORATOR,
  });

  const { asset: a1 } = await generateAsset();
  const mat1 = await ProductDesignOptionsDAO.create({
    id: uuid.v4(),
    isBuiltinOption: true,
    createdAt: new Date(),
    type: "FABRIC",
    title: "A material",
    previewImageId: a1.id,
  });
  const comp1 = await ComponentsDAO.create({
    artworkId: null,
    sketchId: null,
    materialId: mat1.id,
    createdBy: userOne.id,
    parentId: null,
    type: ComponentType.Material,
    id: uuid.v4(),
  });
  const { canvas: can1 } = await generateCanvas({ componentId: comp1.id });

  const {
    collection: deletedCollection,
    notification: deletedCollectionNotification,
  } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    canvasId: can1.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  t.equal(
    a1.id,
    deletedCollectionNotification.annotationImageId,
    "returns image ID for material annotations"
  );

  await db.transaction(async (trx: Knex.Transaction) => {
    await CollectionsDAO.deleteById(trx, deletedCollection.id);
  });

  const { design: deletedDesign } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await deleteById(deletedDesign.id);

  const { annotation: deletedAnnotation } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await AnnotationsDAO.deleteById(deletedAnnotation.id);

  const { canvas: deletedCanvas } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await db.transaction((trx: Knex.Transaction) =>
    CanvasesDAO.del(trx, deletedCanvas.id)
  );

  const { comment: deletedComment } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await CommentsDAO.deleteById(deletedComment.id);

  const { measurement: deletedMeasurement } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.MEASUREMENT_CREATE,
  });
  await MeasurementsDAO.deleteById(deletedMeasurement.id);

  const { collaborator: deletedCollaborator } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: null,
    type: NotificationType.INVITE_COLLABORATOR,
  });
  await CollaboratorsDAO.deleteById(deletedCollaborator.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    t.deepEqual(
      await NotificationsDAO.findByUserId(trx, userTwo.id, {
        offset: 0,
        limit: 10,
      }),
      [
        {
          ...n2,
          actor: userOne,
          collectionTitle: col.title,
          commentText: null,
          componentType: null,
          designImageIds: [],
          designTitle: d.title,
          taskTitle: null,
        },
      ],
      "Returns only the notifications associated with the user (collaborator + user)"
    );
    t.deepEqual(
      await NotificationsDAO.findByUserId(trx, userOne.id, {
        offset: 0,
        limit: 10,
      }),
      [],
      "Returns only the notifications associated with the user (collaborator + user)"
    );
  });

  await NotificationsDAO.del(n2.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    t.deepEqual(
      await NotificationsDAO.findByUserId(trx, userTwo.id, {
        offset: 0,
        limit: 10,
      }),
      [],
      "removes deleted notifications"
    );
  });
});

test("Notifications DAO correctly filters out notifications for deleted designs", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { user: designer } = await createUser({ withSession: false });
  const { user: partner } = await createUser({
    withSession: false,
    role: "PARTNER",
  });

  const { asset: a1, canvas: c1, design: d1 } = await generateCanvas({
    createdBy: designer.id,
    ordering: 1,
  });
  const { asset: a2 } = await generateCanvas({
    designId: d1.id,
    createdBy: designer.id,
    ordering: 0,
  });
  const { collaborator: designerCollab } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: designer.id,
  });
  const { collaborator: partnerCollab } = await generateCollaborator({
    collectionId: null,
    designId: d1.id,
    invitationMessage: "",
    role: "PARTNER",
    userEmail: null,
    userId: partner.id,
  });
  const { stage } = await generateProductDesignStage(
    {
      designId: d1.id,
    },
    designer.id
  );

  const { task } = await generateTask({
    createdBy: designer.id,
    designStageId: stage.id,
  });

  const {
    notification: notificationTaskAssignment,
  } = await generateNotification({
    actorUserId: designer.id,
    recipientUserId: partner.id,
    collaboratorId: partnerCollab.id,
    collectionId: null,
    stageId: stage.id,
    designId: d1.id,
    taskId: task.id,
    type: NotificationType.TASK_ASSIGNMENT,
  });

  t.deepEqual(
    notificationTaskAssignment.designImageIds,
    [a2.id, a1.id],
    "design images in correct order"
  );

  const {
    notification: notificationTaskCompletion,
  } = await generateNotification({
    actorUserId: partner.id,
    recipientUserId: designer.id,
    collaboratorId: designerCollab.id,
    collectionId: null,
    stageId: stage.id,
    designId: d1.id,
    taskId: task.id,
    type: NotificationType.TASK_COMPLETION,
  });

  const { annotation } = await generateAnnotation({
    createdBy: designer.id,
    canvasId: c1.id,
  });
  const { comment } = await generateComment({
    userId: designer.id,
    userName: designer.name,
  });
  const {
    notification: notificationAnnotationCreate,
  } = await generateNotification({
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
    commentId: comment.id,
    annotationId: annotation.id,
    canvasId: c1.id,
    actorUserId: designer.id,
    recipientUserId: partner.id,
    designId: d1.id,
  });

  t.deepEqual(
    notificationAnnotationCreate.annotationImageId,
    a1.id,
    "Annotation notification returns asset ID"
  );

  return db.transaction(async (trx: Knex.Transaction) => {
    t.deepEqual(
      await NotificationsDAO.findByUserId(trx, partner.id, {
        offset: 0,
        limit: 10,
      }),
      [notificationAnnotationCreate, notificationTaskAssignment],
      "Returns only the notifications associated with the user (collaborator + user)"
    );
    t.deepEqual(
      await NotificationsDAO.findByUserId(trx, designer.id, {
        offset: 0,
        limit: 10,
      }),
      [notificationTaskCompletion],
      "Returns only the notifications associated with the user (collaborator + user)"
    );

    await CanvasesDAO.del(trx, c1.id);

    t.deepEqual(
      await NotificationsDAO.findByUserId(trx, partner.id, {
        offset: 0,
        limit: 10,
      }),
      [{ ...notificationTaskAssignment, designImageIds: [a2.id] }],
      "removes the notification associated with the deleted canvas and removes image id"
    );

    await deleteByIds({ designIds: [d1.id], trx });

    t.deepEqual(
      await NotificationsDAO.findByUserId(trx, partner.id, {
        offset: 0,
        limit: 10,
      }),
      [],
      "removes the notifications associated with the deleted design"
    );
    t.deepEqual(
      await NotificationsDAO.findByUserId(trx, designer.id, {
        offset: 0,
        limit: 10,
      }),
      [],
      "removes the notifications associated with the deleted design"
    );
  });
});

test("Notifications DAO supports finding outstanding notifications over 10min old", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { user } = await createUser({ withSession: false });

  const { notification: notificationOne } = await generateNotification({
    actorUserId: user.id,
    createdAt: new Date(new Date().getTime() - 11 * 60 * 1000),
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });

  const { notification: notificationTwo, design } = await generateNotification({
    actorUserId: user.id,
    createdAt: new Date(new Date().getTime() - 126 * 60 * 1000),
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });
  await generateNotification({
    actorUserId: user.id,
    sentEmailAt: new Date(),
    type: NotificationType.COLLECTION_SUBMIT,
  });
  await generateNotification({
    actorUserId: user.id,
    designId: design.id,
    sentEmailAt: new Date(),
    type: NotificationType.PARTNER_DESIGN_BID,
  });
  await generateNotification({
    actorUserId: user.id,
    designId: design.id,
    sentEmailAt: null,
    type: NotificationType.PARTNER_DESIGN_BID,
  });
  const { notification: delNotification } = await generateNotification({
    actorUserId: user.id,
    createdAt: new Date("2019-04-20"),
    designId: design.id,
    sentEmailAt: null,
    readAt: null,
    type: NotificationType.PARTNER_DESIGN_BID,
  });
  await NotificationsDAO.del(delNotification.id);

  await db.transaction(async (trx: Knex.Transaction) => {
    const results: any = await NotificationsDAO.findOutstanding(trx);

    t.deepEqual(
      results,
      [notificationOne, notificationTwo],
      "Returns unsent notifications with recipients"
    );
  });
});

test("Notifications DAO supports marking notifications as sent", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { user } = await createUser();

  const { notification: notificationOne } = await generateNotification({
    actorUserId: user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });
  const { notification: notificationTwo } = await generateNotification({
    actorUserId: user.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    const notifications = await NotificationsDAO.markSent(
      [notificationOne.id, notificationTwo.id],
      trx
    );
    const notificationIds = notifications.map(
      (notification: Notification): string => notification.id
    );
    t.true(
      notificationIds.includes(notificationOne.id),
      "Returns first marked notification"
    );
    t.true(
      notificationIds.includes(notificationTwo.id),
      "Returns second marked notification"
    );
  });
});

test("Notifications DAO supports marking a row as deleted", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });

  const design = await DesignsDAO.create({
    productType: "TEESHIRT",
    title: "Green Tee",
    userId: userTwo.id,
  });

  const { notification: nOne } = await generateNotification({
    actorUserId: userOne.id,
    designId: design.id,
    recipientUserId: userTwo.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });

  await NotificationsDAO.del(nOne.id);

  const unfound = await db.transaction((trx: Knex.Transaction) =>
    NotificationsDAO.findById(trx, nOne.id)
  );
  t.equal(unfound, null, "A deleted notification is not found");
});

test("Notifications DAO supports deleting similar notifications", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const userOne = await createUser({ withSession: false });
  const userTwo = await createUser({ withSession: false });
  const { user: admin } = await createUser({
    withSession: false,
    role: "ADMIN",
  });

  const design = await DesignsDAO.create({
    productType: "TEESHIRT",
    title: "Green Tee",
    userId: userTwo.user.id,
  });
  const { collection } = await generateCollection({
    createdBy: userTwo.user.id,
  });

  await NotificationsDAO.create({
    ...templateNotification,
    actorUserId: userTwo.user.id,
    collectionId: collection.id,
    id: uuid.v4(),
    recipientUserId: admin.id,
    type: NotificationType.COLLECTION_SUBMIT,
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: admin.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });
  await generateNotification({
    actorUserId: userOne.user.id,
    designId: design.id,
    recipientUserId: admin.id,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  });
  const unsentNotification: PartnerAcceptServiceBidNotification = {
    ...templateNotification,
    actorUserId: userOne.user.id,
    createdAt: new Date(),
    designId: design.id,
    id: uuid.v4(),
    recipientUserId: admin.id,
    sentEmailAt: null,
    type: NotificationType.PARTNER_ACCEPT_SERVICE_BID,
  };

  const deletedCount = await NotificationsDAO.deleteRecent(unsentNotification);

  t.deepEqual(deletedCount, 2, "Successfully deletes similar notifications");
});

test("Notifications DAO supports marking read", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });
  const { collection } = await generateCollection({ createdBy: userOne.id });
  const { collaborator: c1 } = await generateCollaborator({
    collectionId: collection.id,
    designId: null,
    invitationMessage: "",
    role: "EDIT",
    userEmail: null,
    userId: userTwo.id,
  });
  const data: InviteCollaboratorNotification = {
    ...templateNotification,
    actorUserId: userOne.id,
    collaboratorId: c1.id,
    collectionId: collection.id,
    createdAt: new Date(),
    designId: null,
    id: uuid.v4(),
    recipientUserId: userTwo.id,
    sentEmailAt: new Date(),
    type: NotificationType.INVITE_COLLABORATOR,
  };

  return db.transaction(async (trx: Knex.Transaction) => {
    const inserted = await NotificationsDAO.create(data);
    const result = await NotificationsDAO.findById(trx, inserted.id);
    t.deepEqual(result, inserted, "Returned the inserted notification");
    await NotificationsDAO.markRead([inserted.id]);
    const read = await NotificationsDAO.findById(trx, inserted.id);
    if (!read) {
      throw new Error("FindById failed!");
    }
    t.notDeepEqual(read.readAt, null, "readAt is no longer null");
  });
});

test("Notifications DAO supports finding unread count", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });

  await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    sentEmailAt: new Date(),
    type: NotificationType.INVITE_COLLABORATOR,
  });

  await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });

  await generateNotification({
    actorUserId: userOne.id,
    readAt: new Date(),
    recipientUserId: userTwo.id,
    type: NotificationType.TASK_ASSIGNMENT,
  });

  await generateNotification({
    actorUserId: userOne.id,
    readAt: new Date(),
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });

  const { collection: deletedCollection } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await db.transaction(async (trx: Knex.Transaction) => {
    await CollectionsDAO.deleteById(trx, deletedCollection.id);
  });

  const { design: deletedDesign } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await deleteById(deletedDesign.id);

  const { annotation: deletedAnnotation } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await AnnotationsDAO.deleteById(deletedAnnotation.id);

  const { canvas: deletedCanvas } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await db.transaction((trx: Knex.Transaction) =>
    CanvasesDAO.del(trx, deletedCanvas.id)
  );

  const { comment: deletedComment } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_CREATE,
  });
  await CommentsDAO.deleteById(deletedComment.id);

  const { measurement: deletedMeasurement } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.MEASUREMENT_CREATE,
  });
  await MeasurementsDAO.deleteById(deletedMeasurement.id);

  const { collaborator: deletedCollaborator } = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: null,
    type: NotificationType.INVITE_COLLABORATOR,
  });
  await CollaboratorsDAO.deleteById(deletedCollaborator.id);

  return db.transaction(async (trx: Knex.Transaction) => {
    const unreadCount = await NotificationsDAO.findUnreadCountByUserId(
      trx,
      userTwo.id
    );
    t.deepEqual(unreadCount, 2, "there are two unread notification");
  });
});

test("NotificationsDAO.archiveOlderThan", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const setup = await generateNotifications();
  const { designer, partner } = setup.users;

  return await db.transaction(async (trx: Knex.Transaction) => {
    const notificationsStart = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
      }
    );

    t.equal(
      notificationsStart.length,
      6,
      "base notification count for designer"
    );

    const designerNotificationsBefore = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.UNARCHIVED,
      }
    );

    const wrongUserArchivedCount = await NotificationsDAO.archiveOlderThan(
      trx,
      {
        notificationId: designerNotificationsBefore[2].id,
        recipientUserId: setup.users.other.id,
        onlyArchiveInbox: false,
      }
    );
    t.equal(
      wrongUserArchivedCount,
      0,
      "with wrong user sets no notifications as archived"
    );
    const newlyArchivedCount = await NotificationsDAO.archiveOlderThan(trx, {
      notificationId: designerNotificationsBefore[2].id,
      recipientUserId: designer.id,
      onlyArchiveInbox: false,
    });
    t.equal(
      newlyArchivedCount,
      4,
      "number of archived notifications equals the number of older messages than the cursor id"
    );
    const newlyArchivedCountAgain = await NotificationsDAO.archiveOlderThan(
      trx,
      {
        notificationId: designerNotificationsBefore[2].id,
        recipientUserId: designer.id,
        onlyArchiveInbox: false,
      }
    );
    t.equal(
      newlyArchivedCountAgain,
      0,
      "archiveOlderThan can be called multiple times succesfully"
    );

    const designerNotificationsAfter = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.UNARCHIVED,
      }
    );

    t.deepEqual(
      designerNotificationsBefore.slice(0, 2),
      designerNotificationsAfter
    );

    t.equal(
      await NotificationsDAO.findUnreadCountByUserId(trx, designer.id),
      2,
      "notification count before deleting design"
    );
    await deleteById(setup.designs[0].id);
    t.equal(
      await NotificationsDAO.findUnreadCountByUserId(trx, designer.id),
      1,
      "notification count after deleting design"
    );

    const partnerNotificationsBefore = await NotificationsDAO.findByUserId(
      trx,
      partner.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.UNARCHIVED,
      }
    );
    const partnerNewlyArchivedCount = await NotificationsDAO.archiveOlderThan(
      trx,
      {
        notificationId: partnerNotificationsBefore[0].id,
        recipientUserId: partner.id,
        onlyArchiveInbox: false,
      }
    );

    t.equal(
      partnerNotificationsBefore.length,
      2,
      "total unarchived partner notifications before"
    );
    t.equal(
      partnerNewlyArchivedCount,
      5,
      "updates archived date for un notifications even if they would be excluded"
    );
    const partnerNotificationsAfter = await NotificationsDAO.findByUserId(
      trx,
      partner.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.UNARCHIVED,
      }
    );
    t.equal(
      partnerNotificationsAfter.length,
      0,
      "total unarchived partner notifications after"
    );
  });
});

test("NotificationsDAO.findById returns notifications with approval step titles", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { recipient } = await generateNotification({
    type: NotificationType.APPROVAL_STEP_COMMENT_MENTION,
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    NotificationsDAO.findByUserId(trx, recipient.id, {
      limit: 100,
      offset: 0,
    })
  );

  t.equal(
    notifications[0].approvalStepTitle,
    "Checkout",
    "Stage title is returned"
  );
});

test("NotificationsDAO.findById returns notifications with approval submission artifact type", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});

  const { submission } = await db.transaction(async (trx: Knex.Transaction) =>
    generateApprovalSubmission(trx, {
      title: "Technical design",
    })
  );

  const { recipient } = await generateNotification({
    type: NotificationType.APPROVAL_STEP_SUBMISSION_ASSIGNMENT,
    approvalSubmissionId: submission.id,
  });

  const notifications = await db.transaction((trx: Knex.Transaction) =>
    NotificationsDAO.findByUserId(trx, recipient.id, {
      limit: 100,
      offset: 0,
    })
  );

  t.equal(
    notifications[0].approvalSubmissionTitle,
    "Technical design",
    "artifact type is returned"
  );
});

test("NotificationsDAO.update updates a notification", async (t: tape.Test) => {
  const notification = await generateNotification({
    type: NotificationType.COSTING_EXPIRED,
    archivedAt: null,
  });
  const testTime = new Date(2020, 1, 24);

  const updated = await db.transaction((trx: Knex.Transaction) =>
    NotificationsDAO.update(trx, notification.id, { archivedAt: testTime })
  );

  t.equal(
    updated.archivedAt!.getTime(),
    testTime.getTime(),
    "Updates a column"
  );
});

test("Notifications DAO filters notifications", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const { user: userOne } = await createUser({ withSession: false });
  const { user: userTwo } = await createUser({ withSession: false });

  const unarchivedNotification = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    type: NotificationType.ANNOTATION_COMMENT_REPLY,
    archivedAt: null,
  });

  const archivedNotification = await generateNotification({
    actorUserId: userOne.id,
    recipientUserId: userTwo.id,
    sentEmailAt: new Date(),
    type: NotificationType.INVITE_COLLABORATOR,
    archivedAt: new Date(),
  });

  return db.transaction(async (trx: Knex.Transaction) => {
    const archivedNotifications = await NotificationsDAO.findByUserId(
      trx,
      userTwo.id,
      {
        offset: 0,
        limit: 10,
        filter: NotificationFilter.ARCHIVED,
      }
    );

    t.deepEqual(
      archivedNotifications,
      [archivedNotification.notification],
      "Returns archived notifications"
    );

    const inboxNotifications = await NotificationsDAO.findByUserId(
      trx,
      userTwo.id,
      {
        offset: 0,
        limit: 10,
        filter: NotificationFilter.INBOX,
      }
    );

    t.deepEqual(
      inboxNotifications,
      [unarchivedNotification.notification],
      "Returns inbox notifications"
    );

    const unarchivedNotifications = await NotificationsDAO.findByUserId(
      trx,
      userTwo.id,
      {
        offset: 0,
        limit: 10,
        filter: NotificationFilter.UNARCHIVED,
      }
    );
    t.deepEqual(
      unarchivedNotifications,
      [unarchivedNotification.notification],
      "Returns unarchived notifications"
    );
  });
});

test("NotificationsDAO.archiveOlderThan onlyArchiveInbox", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const setup = await generateNotifications();

  const { designer } = setup.users;
  return await db.transaction(async (trx: Knex.Transaction) => {
    const inboxNotificationsBefore = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.INBOX,
      }
    );
    t.equal(inboxNotificationsBefore.length, 2, "base inbox count");

    const unarchivedNotificationsBefore = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.UNARCHIVED,
      }
    );
    t.equal(unarchivedNotificationsBefore.length, 6, "base unarchived count");

    await NotificationsDAO.archiveOlderThan(trx, {
      notificationId: inboxNotificationsBefore[0].id,
      recipientUserId: designer.id,
      onlyArchiveInbox: true,
    });

    const inboxNotificationsAfter = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.INBOX,
      }
    );
    t.equal(
      inboxNotificationsAfter.length,
      0,
      "archives all inbox notifications"
    );

    const unarchivedNotificationsAfter = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.UNARCHIVED,
      }
    );
    t.equal(
      unarchivedNotificationsAfter.length,
      unarchivedNotificationsBefore.length - inboxNotificationsBefore.length,
      "only arcives inbox notifications"
    );
  });
});

test("NotificationsDAO.archiveOlderThan marks unread notifications as read", async (t: tape.Test) => {
  sandbox()
    .stub(NotificationAnnouncer, "announceNotificationCreation")
    .resolves({});
  const setup = await generateNotifications();
  const readTime = new Date(2020, 1, 27);

  const { designer } = setup.users;
  return await db.transaction(async (trx: Knex.Transaction) => {
    const notificationsBefore = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.INBOX,
      }
    );

    await NotificationsDAO.update(trx, notificationsBefore[0].id, {
      readAt: readTime,
    });
    await NotificationsDAO.update(trx, notificationsBefore[1].id, {
      readAt: null,
    });

    await NotificationsDAO.archiveOlderThan(trx, {
      notificationId: notificationsBefore[0].id,
      recipientUserId: designer.id,
      onlyArchiveInbox: true,
    });

    const notificationsAfter = await NotificationsDAO.findByUserId(
      trx,
      designer.id,
      {
        limit: 100,
        offset: 0,
        filter: NotificationFilter.ARCHIVED,
      }
    );

    t.deepEqual(
      notificationsAfter[0].readAt,
      readTime,
      "Leaves read notifications as read"
    );
    t.isNotEqual(
      notificationsAfter[1].readAt,
      null,
      "Marks unread notifications as read"
    );
  });
});
