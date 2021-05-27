import tape from "tape";
import uuid from "node-uuid";
import Knex from "knex";

import { test } from "../../test-helpers/fresh";
import {
  create,
  deleteById,
  findById,
  update,
  extractDesignIdFromCommentInput,
} from "./dao";
import { CommentInputType } from "./graphql-types";
import createUser from "../../test-helpers/create-user";
import generateAsset from "../../test-helpers/factories/asset";
import generateComment from "../../test-helpers/factories/comment";
import * as CommentAttachmentDAO from "../comment-attachments/dao";
import db from "../../services/db";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import generateAnnotation from "../../test-helpers/factories/product-design-canvas-annotation";

test("Comment DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });

  const result = await findById(comment.id);
  t.deepEqual(result, comment, "Inserted comment matches found");
});

test("Comment DAO returns deleted comments those have replies", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const deletedComment = await generateComment({
    createdAt: new Date(2012, 10, 2),
    deletedAt: new Date(2013, 10, 2),
    parentCommentId: null,
    text: "A deleted comment",
    userId: user.id,
  });

  const reply = await generateComment({
    createdAt: new Date(2012, 10, 2),
    deletedAt: null,
    parentCommentId: deletedComment.comment.id,
    text: "A reply to deleted comment",
    userId: user.id,
  });

  const noResult = await findById(deletedComment.comment.id);
  t.equal(noResult, null, "Cannot find deleted comment by default");

  const deletedFound = await db.transaction(async (trx: Knex.Transaction) => {
    return findById(deletedComment.comment.id, trx, {
      includeDeletedParents: true,
    });
  });
  t.deepEqual(
    deletedFound,
    deletedComment.comment,
    "can find deleted comment which has replies"
  );

  const replyFound = await db.transaction(async (trx: Knex.Transaction) => {
    return findById(reply.comment.id, trx, {
      includeDeletedParents: true,
    });
  });
  t.deepEqual(
    replyFound,
    reply.comment,
    "can find not deleted reply with includeDeletedParents option"
  );
});

test("Comment DAO doesn't returns deleted comment those replies are deleted", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const deletedComment = await generateComment({
    createdAt: new Date(2012, 10, 2),
    deletedAt: new Date(2013, 10, 2),
    parentCommentId: null,
    text: "A deleted comment",
    userId: user.id,
  });

  const reply = await generateComment({
    createdAt: new Date(2012, 10, 2),
    deletedAt: new Date(2013, 10, 2),
    parentCommentId: deletedComment.comment.id,
    text: "A reply to deleted comment",
    userId: user.id,
  });

  const reply2 = await generateComment({
    createdAt: new Date(2012, 10, 2),
    deletedAt: new Date(2013, 10, 2),
    parentCommentId: deletedComment.comment.id,
    text: "A reply to deleted comment",
    userId: user.id,
  });

  const noResult = await findById(deletedComment.comment.id);
  t.equal(noResult, null, "Cannot find deleted comment by default");

  const deletedNotFound = await db.transaction(
    async (trx: Knex.Transaction) => {
      return findById(deletedComment.comment.id, trx, {
        includeDeletedParents: true,
      });
    }
  );
  t.equal(
    deletedNotFound,
    null,
    "cannot find deleted comment which has deleted replies"
  );

  const reply1NotFound = await db.transaction(async (trx: Knex.Transaction) => {
    return findById(reply.comment.id, trx, {
      includeDeletedParents: true,
    });
  });
  t.equal(
    reply1NotFound,
    null,
    "can not find deleted reply with includeDeletedParents option"
  );

  const reply2NotFound = await db.transaction(async (trx: Knex.Transaction) => {
    return findById(reply2.comment.id, trx, {
      includeDeletedParents: true,
    });
  });
  t.equal(
    reply2NotFound,
    null,
    "can not find deleted reply with includeDeletedParents option"
  );
});

test("Comment DAO supports retrieval with attachments", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
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

  const result = await findById(comment.id);
  if (result === null) {
    return t.fail("No comments were returned");
  }
  t.assert(result.attachments.length === 2, "Returns attachments");
});

test("Comment DAO supports update", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });
  const updated = await update({
    ...comment,
    text: "Updated",
  });

  const result = await findById(comment.id);
  t.deepEqual(result, updated, "Updated comment matches found");
});

test("Comment DAO supports delete", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const comment = await create({
    createdAt: new Date(),
    deletedAt: null,
    id: uuid.v4(),
    isPinned: false,
    parentCommentId: null,
    text: "A comment",
    userId: user.id,
  });
  await deleteById(comment.id);

  const result = await findById(comment.id);
  t.equal(result, null, "Removes comment");
});

test("extractDesignIdFromCommentInput requires approvalStepId/annotationId", async (t: tape.Test) => {
  const input: CommentInputType = {
    text: "hey",
    parentCommentId: null,
    isPinned: false,
    approvalStepId: null,
    annotationId: null,
  };
  try {
    await extractDesignIdFromCommentInput(db, input);
    t.fail("Should throw if both approvalStepId and annotationId are empty");
  } catch (err) {
    t.is(err.message, "Comment should have approvalStepId or annotationId");
  }
  try {
    await extractDesignIdFromCommentInput(db, {
      ...input,
      approvalStepId: "s1",
      annotationId: "a1",
    });
    t.fail("Should throw if both approvalStepId and annotationId are set");
  } catch (err) {
    t.is(
      err.message,
      "Comment should not have approvalStepId and annotationId simultaneously"
    );
  }
});

test("extractDesignIdFromCommentInput should work for approvalStepId case", async (t: tape.Test) => {
  const trx = await db.transaction();
  try {
    const { approvalStep } = await generateApprovalStep(trx);

    const designId = await extractDesignIdFromCommentInput(trx, {
      text: "hey",
      parentCommentId: null,
      isPinned: false,
      approvalStepId: approvalStep.id,
      annotationId: null,
    });
    t.is(designId, approvalStep.designId);
  } finally {
    await trx.rollback();
  }
});

test("extractDesignIdFromCommentInput should work for annotation case", async (t: tape.Test) => {
  const { annotation, design } = await generateAnnotation();
  const designId = await extractDesignIdFromCommentInput(db, {
    text: "hey",
    parentCommentId: null,
    isPinned: false,
    approvalStepId: null,
    annotationId: annotation.id,
  });
  t.is(designId, design.id);
});
