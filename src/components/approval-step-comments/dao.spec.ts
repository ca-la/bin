import Knex from "knex";
import * as uuid from "node-uuid";

import { test, Test } from "../../test-helpers/fresh";
import { staticProductDesign } from "../../test-helpers/factories/product-design";
import * as ProductDesignsDAO from "../product-designs/dao";
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
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: "d1", userId: user.id })
  );

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
    dueAt: null,
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const { comment, createdBy: commenter } = await generateComment();
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.create(trx, {
      commentId: comment.id,
      approvalStepId: approvalStep.id,
    })
  );

  const found = await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepCommentDAO.findByStepId(trx, approvalStep.id)
  );

  t.equal(found.length, 1, "comments are returned");
  t.equal(found[0].userId, commenter.id);
});
