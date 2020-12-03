import Knex from "knex";
import * as uuid from "node-uuid";
import { isEqual } from "lodash";

import { test, Test } from "../../test-helpers/fresh";
import { staticProductDesign } from "../../test-helpers/factories/product-design";
import * as ProductDesignsDAO from "../product-designs/dao";
import db from "../../services/db";
import ProductDesign from "../product-designs/domain-objects/product-design";
import createUser from "../../test-helpers/create-user";
import generateApprovalStep from "../../test-helpers/factories/design-approval-step";
import generateApprovalSubmission from "../../test-helpers/factories/design-approval-submission";
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "../approval-steps/domain-object";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import ResourceNotFoundError from "../../errors/resource-not-found";

import ApprovalStepSubmission, {
  ApprovalStepSubmissionArtifactType,
  ApprovalStepSubmissionState,
} from "./types";
import * as ApprovalStepSubmissionsDAO from "./dao";

test("ApprovalStepSubmissionsDAO can create multiple submissions and retrieve by step and id", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  const d1: ProductDesign = await ProductDesignsDAO.create(
    staticProductDesign({ id: "d1", userId: user.id })
  );

  const as1: ApprovalStep = {
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
  const as2: ApprovalStep = {
    state: ApprovalStepState.UNSTARTED,
    id: uuid.v4(),
    title: "Technical Design",
    ordering: 1,
    designId: d1.id,
    reason: null,
    type: ApprovalStepType.TECHNICAL_DESIGN,
    collaboratorId: null,
    teamUserId: null,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null,
    dueAt: null,
  };

  const sub1: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    id: uuid.v4(),
    createdAt: new Date(),
    createdBy: null,
    deletedAt: null,
    stepId: as1.id,
    collaboratorId: null,
    teamUserId: null,
    title: "Technical Design",
  };
  const sub2: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
    id: uuid.v4(),
    createdAt: new Date(),
    createdBy: null,
    deletedAt: null,
    stepId: as1.id,
    collaboratorId: null,
    teamUserId: null,
    title: "Technical Design",
  };
  const sub3: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.TECHNICAL_DESIGN,
    id: uuid.v4(),
    createdAt: new Date(),
    createdBy: null,
    deletedAt: null,
    stepId: as2.id,
    collaboratorId: null,
    teamUserId: null,
    title: "Technical Design",
  };
  const sub4: ApprovalStepSubmission = {
    state: ApprovalStepSubmissionState.UNSUBMITTED,
    artifactType: ApprovalStepSubmissionArtifactType.SAMPLE,
    id: uuid.v4(),
    createdAt: new Date(),
    createdBy: null,
    deletedAt: null,
    stepId: as2.id,
    collaboratorId: null,
    teamUserId: null,
    title: "Technical Design",
  };

  await db.transaction(async (trx: Knex.Transaction) => {
    await ApprovalStepsDAO.createAll(trx, [as1, as2]);
    const created = await ApprovalStepSubmissionsDAO.createAll(trx, [
      sub1,
      sub2,
      sub3,
      sub4,
    ]);

    t.deepEqual(
      created,
      [sub1, sub2, sub3, sub4],
      "returns inserted submissions"
    );

    const foundByStep = await ApprovalStepSubmissionsDAO.findByStep(
      trx,
      as1.id
    );

    t.true(
      isEqual(new Set(foundByStep), new Set([sub1, sub2])),
      "returns submissions by step"
    );

    const foundById = await ApprovalStepSubmissionsDAO.findById(trx, sub1.id);

    t.true(isEqual(foundById, sub1), "returns submission by id");

    const foundByDesign = await ApprovalStepSubmissionsDAO.findByDesign(
      trx,
      as1.designId
    );

    t.true(
      isEqual(new Set(foundByDesign), new Set([sub1, sub2, sub3, sub4])),
      "returns submissions by design"
    );
  });
});

test("ApprovalStepSubmissionsDAO can delete the submission by id", async (t: Test) => {
  const trx = await db.transaction();
  try {
    const { approvalStep } = await generateApprovalStep(trx);
    const { submission } = await generateApprovalSubmission(trx, {
      stepId: approvalStep.id,
      title: "Review X",
    });

    t.isEqual(
      submission.deletedAt,
      null,
      "Created submission doesn't have deletedAt timestamp"
    );

    let deletedSubmission;
    try {
      deletedSubmission = await ApprovalStepSubmissionsDAO.deleteById(
        trx,
        submission.id
      );
      t.pass("allows deleting submission that were created");
    } catch {
      t.fail("should not reject deleting submission that were created");
    }

    t.isNotEqual(
      deletedSubmission?.deletedAt,
      null,
      "Succesfully deleted submission"
    );

    try {
      await ApprovalStepSubmissionsDAO.deleteById(trx, submission.id);
    } catch (err) {
      t.ok(
        err instanceof ResourceNotFoundError,
        "deleting a second time rejects with ResourceNotFoundError"
      );
      t.pass(
        "rejects when trying to delete something that has already been deleted"
      );
    }

    try {
      await ApprovalStepSubmissionsDAO.deleteById(trx, uuid.v4());
      t.fail("deleting something that does not exists should not succeed");
    } catch (err) {
      t.ok(
        err instanceof ResourceNotFoundError,
        "deleting something that does not exists rejects with ResourceNotFoundError"
      );
      t.pass("rejects when trying to delete something that does not exist");
    }

    const found = await ApprovalStepSubmissionsDAO.findById(trx, submission.id);
    t.equal(found, null, ".find does not return deleted submission");
  } finally {
    await trx.rollback();
  }
});
