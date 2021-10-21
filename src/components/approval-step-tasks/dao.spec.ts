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
import * as ApprovalStepTaskDAO from "./dao";
import createUser from "../../test-helpers/create-user";
import generateTask from "../../test-helpers/factories/task";
import { findByApprovalStepId } from "../../dao/task-events";

test("ApprovalStepTasksDAO can create multiple tasks and retrieve by step", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await generateDesign({ userId: user.id });

  const approvalStep: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Checkout",
    ordering: 0,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.CHECKOUT,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  };
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepsDAO.createAll(trx, [approvalStep])
  );

  const { task, createdBy } = await generateTask();
  await db.transaction((trx: Knex.Transaction) =>
    ApprovalStepTaskDAO.create(trx, {
      taskId: task.id,
      approvalStepId: approvalStep.id,
    })
  );

  const found = await findByApprovalStepId(approvalStep.id);

  t.equal(found.length, 1, "tasks are returned");
  t.equal(found[0].createdBy, createdBy.id, "createdBy set to proper user");
  t.equal(found[0].design.id, d1.id, "includes design");

  await db.transaction(async (trx: Knex.Transaction) => {
    const stepFound = await ApprovalStepTaskDAO.findByTaskId(trx, task.id);
    t.equal(
      stepFound && stepFound.approvalStepId,
      approvalStep.id,
      "findByTaskId returns the step with proper id"
    );
  });
});
