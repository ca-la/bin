import uuid from "node-uuid";
import { Role } from "@cala/ts-lib/dist/users";
import Knex from "knex";
import Sinon from "sinon";

import * as AnnotationsDAO from "../../components/product-design-canvas-annotations/dao";
import * as CommentsDAO from "../../components/comments/dao";
import { Annotation } from "../../components/product-design-canvas-annotations/types";
import Collaborator from "../../components/collaborators/types";
import CollectionDb from "../../components/collections/domain-object";
import sendCreationNotifications from "./send-creation-notifications";
import User from "../../components/users/domain-object";
import createUser from "../../test-helpers/create-user";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as CreateNotifications from "../../services/create-notifications";
import generateCollaborator from "../../test-helpers/factories/collaborator";
import generateCollection from "../../test-helpers/factories/collection";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import db from "../../services/db";
import generateComment from "../../test-helpers/factories/comment";
import ProductDesign from "../product-designs/domain-objects/product-design";
import createDesign from "../../services/create-design";

async function setup(): Promise<{
  annotation: Annotation;
  collection: CollectionDb;
  collaborator: Collaborator;
  collaboratorUser: User;
  mentionStub: Sinon.SinonStub;
  ownerStub: Sinon.SinonStub;
  ownerUser: User;
  replyStub: Sinon.SinonStub;
  design: ProductDesign;
}> {
  const ownerStub = sandbox()
    .stub(
      CreateNotifications,
      "sendDesignOwnerAnnotationCommentCreateNotification"
    )
    .resolves();

  const mentionStub = sandbox()
    .stub(CreateNotifications, "sendAnnotationCommentMentionNotification")
    .resolves();

  const replyStub = sandbox()
    .stub(CreateNotifications, "sendAnnotationCommentReplyNotification")
    .resolves();

  const { user: ownerUser } = await createUser();
  const { user: collaboratorUser } = await createUser();

  const { collection } = await generateCollection({ createdBy: ownerUser.id });
  const { collaborator } = await generateCollaborator({
    collectionId: collection.id,
    userId: collaboratorUser.id,
  });

  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Green Tee",
    userId: ownerUser.id,
    collectionIds: [collection.id],
  });

  const { canvas: designCanvas } = await generateCanvas({
    componentId: null,
    createdBy: ownerUser.id,
    designId: design.id,
    height: 200,
    ordering: 0,
    title: "My Green Tee",
    width: 200,
    x: 0,
    y: 0,
  });

  const annotation = await db.transaction((trx: Knex.Transaction) =>
    AnnotationsDAO.create(trx, {
      canvasId: designCanvas.id,
      createdBy: ownerUser.id,
      deletedAt: null,
      id: uuid.v4(),
      x: 1,
      y: 1,
    })
  );

  return {
    annotation,
    collaborator,
    collaboratorUser,
    collection,
    mentionStub,
    ownerStub,
    ownerUser,
    replyStub,
    design,
  };
}

test("sendCreationNotifications loops through mentions and sends notifications", async (t: Test) => {
  const {
    collaboratorUser,
    annotation,
    collaborator,
    ownerUser,
    ownerStub,
    mentionStub,
  } = await setup();

  const comment = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    mentions: {},
    parentCommentId: null,
    text: `A comment @<${collaborator.id}|collaborator>`,
    userEmail: "cool@me.me",
    userId: "purposefully incorrect",
    userName: "Somebody cool",
    userRole: "USER" as Role,
    attachments: [],
    replyCount: 0,
  };
  await db.transaction(async (trx: Knex.Transaction) => {
    await sendCreationNotifications(trx, {
      actorUserId: ownerUser.id,
      annotationId: annotation.id,
      comment,
    });
  });

  t.equal(ownerStub.callCount, 1);

  t.deepEqual(ownerStub.firstCall.args.slice(0, 5), [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    [collaboratorUser.id],
  ]);

  t.equal(mentionStub.callCount, 1);

  t.deepEqual(mentionStub.firstCall.args.slice(0, 5), [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    collaboratorUser.id,
  ]);
});

test("sendCreationNotifications sends notifications to parent of thread and its participants", async (t: Test) => {
  const { collaboratorUser, annotation, replyStub, design } = await setup();

  const { comment: parentComment } = await generateComment({
    userId: collaboratorUser.id,
  });

  const { comment: comment1 } = await generateComment({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: parentComment.id,
    text: "Thats a good point..",
    userEmail: "cool@example.com",
    userName: "Somebody cool",
    userRole: "USER" as Role,
    attachments: [],
  });

  await generateCollaborator({
    designId: design.id,
    userId: comment1.userId,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await sendCreationNotifications(trx, {
      actorUserId: comment1.userId,
      annotationId: annotation.id,
      comment: comment1,
    });
  });

  t.equal(replyStub.callCount, 2, "Creates a reply notification");
  replyStub.reset();

  await CommentsDAO.deleteById(parentComment.id);
  await db.transaction(async (trx: Knex.Transaction) => {
    await sendCreationNotifications(trx, {
      actorUserId: comment1.userId,
      annotationId: annotation.id,
      comment: comment1,
    });
  });
  t.equal(
    replyStub.callCount,
    2,
    "Creates a reply notification even if the parent comment is deleted"
  );
  replyStub.reset();

  const { comment: comment2 } = await generateComment({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: parentComment.id,
    text: "That is not a good point",
    userEmail: "uncool@example.com",
    userName: "Somebody uncool",
    userRole: "USER" as Role,
    attachments: [],
  });

  await generateCollaborator({
    designId: design.id,
    userId: comment2.userId,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await sendCreationNotifications(trx, {
      actorUserId: comment2.userId,
      annotationId: annotation.id,
      comment: comment2,
    });
  });

  t.equal(replyStub.callCount, 3, "Creates a reply notification");
  replyStub.reset();
});

test("sendCreationNotifications sends a notification to @mentioned users in a reply thread", async (t: Test) => {
  const {
    collaboratorUser,
    annotation,
    replyStub,
    design,
    mentionStub,
  } = await setup();

  const { comment: parentComment } = await generateComment({
    userId: collaboratorUser.id,
  });

  const { comment: comment1 } = await generateComment({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: parentComment.id,
    text: "Thats a good point..",
    userEmail: "cool@example.com",
    userName: "Somebody cool",
    userRole: "USER" as Role,
    attachments: [],
  });

  const { collaborator } = await generateCollaborator({
    designId: design.id,
    userId: comment1.userId,
  });

  await db.transaction(async (trx: Knex.Transaction) =>
    sendCreationNotifications(trx, {
      actorUserId: comment1.userId,
      annotationId: annotation.id,
      comment: comment1,
    })
  );

  t.equal(replyStub.callCount, 2, "Creates a reply notification");
  replyStub.reset();

  await CommentsDAO.deleteById(parentComment.id);
  await db.transaction(async (trx: Knex.Transaction) => {
    await sendCreationNotifications(trx, {
      actorUserId: comment1.userId,
      annotationId: annotation.id,
      comment: comment1,
    });
  });
  t.equal(
    replyStub.callCount,
    2,
    "Creates a reply notification even if the parent comment is deleted"
  );
  replyStub.reset();

  const { comment: comment2 } = await generateComment({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: parentComment.id,
    text: `A comment @<${collaborator.id}|collaborator>`,
    userEmail: "uncool@example.com",
    userName: "Somebody uncool",
    userRole: "USER" as Role,
    attachments: [],
  });

  await generateCollaborator({
    designId: design.id,
    userId: comment2.userId,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await sendCreationNotifications(trx, {
      actorUserId: comment2.userId,
      annotationId: annotation.id,
      comment: comment2,
    });
  });

  t.equal(
    replyStub.callCount,
    0,
    "Does not notify thread participants if @mentioned"
  );
  t.equal(mentionStub.callCount, 1);
  replyStub.reset();
});

test("sendCreationNotifications continues processing notifications once it hits an unregistered collaborator", async (t: Test) => {
  const {
    collaboratorUser,
    collection,
    annotation,
    collaborator,
    ownerUser,
    mentionStub,
  } = await setup();

  // Adding a collaborator who does not have a full user account
  const { collaborator: collaborator2 } = await generateCollaborator({
    collectionId: collection.id,
    userEmail: "foo@example.com",
  });

  // And a third collaborator who does have an account
  const { user: collaborator3User } = await createUser();

  const { collaborator: collaborator3 } = await generateCollaborator({
    collectionId: collection.id,
    userId: collaborator3User.id,
  });

  const comment = {
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    mentions: {},
    parentCommentId: null,
    text: `Hi @<${collaborator.id}|collaborator> @<${collaborator2.id}|collaborator> @<${collaborator3.id}|collaborator> how's it going`,
    userEmail: "cool@example.com",
    userId: "123",
    userName: "Somebody cool",
    userRole: "USER" as Role,
    attachments: [],
    replyCount: 0,
  };
  await db.transaction(async (trx: Knex.Transaction) => {
    await sendCreationNotifications(trx, {
      actorUserId: ownerUser.id,
      annotationId: annotation.id,
      comment,
    });
  });
  t.equal(mentionStub.callCount, 2);

  t.deepEqual(mentionStub.firstCall.args.slice(0, 5), [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    collaboratorUser.id,
  ]);

  t.deepEqual(mentionStub.args[1].slice(0, 5), [
    annotation.id,
    annotation.canvasId,
    comment.id,
    ownerUser.id,
    collaborator3User.id,
  ]);
});
