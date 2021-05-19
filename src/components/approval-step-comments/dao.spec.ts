import Knex from "knex";
import * as uuid from "node-uuid";

import { test, Test } from "../../test-helpers/fresh";
import { generateDesign } from "../../test-helpers/factories/product-design";
import db from "../../services/db";
import ProductDesign from "../product-designs/domain-objects/product-design";

import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "../approval-steps/domain-object";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import * as ApprovalStepCommentDAO from "./dao";
import createUser from "../../test-helpers/create-user";
import generateComment from "../../test-helpers/factories/comment";

test("ApprovalStepsDAO can create multiple steps and retrieve by design", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await generateDesign({ id: "d1", userId: user.id });

  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    collaboratorId: null,
    teamUserId: null,
    dueAt: null,
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const { comment, createdBy: commenter } = await generateComment();
  const { comment: deletedComment } = await generateComment({
    deletedAt: new Date(2012, 10, 8),
    userId: commenter.id,
  });
  const { comment: reply } = await generateComment({
    userId: commenter.id,
    parentCommentId: deletedComment.id,
  });
  const { comment: deletedWithoutReplies } = await generateComment({
    deletedAt: new Date(2012, 10, 8),
    userId: commenter.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepCommentDAO.create(trx, {
      commentId: comment.id,
      approvalStepId: approvalStep.id,
    });
    await ApprovalStepCommentDAO.create(trx, {
      commentId: deletedComment.id,
      approvalStepId: approvalStep.id,
    });
    await ApprovalStepCommentDAO.create(trx, {
      commentId: reply.id,
      approvalStepId: approvalStep.id,
    });
    await ApprovalStepCommentDAO.create(trx, {
      commentId: deletedWithoutReplies.id,
      approvalStepId: approvalStep.id,
    });
  });

  const found = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.findByStepId(trx, approvalStep.id)
  );

  t.equal(found.length, 3, "comments are returned");
  t.equal(found[0].userId, commenter.id);
  t.deepEqual(
    found,
    [comment, deletedComment, reply],
    "returned expected comments (with deleted with replies and without deleted comment without replies)"
  );
});
