import Knex from "knex";

import ApprovalStepSubmission, {
  ApprovalStepSubmissionRow,
  domain,
} from "./types";
import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";

const TABLE_NAME = "design_approval_submissions";

const standardDao = buildDao<ApprovalStepSubmission, ApprovalStepSubmissionRow>(
  domain,
  TABLE_NAME,
  adapter,
  {
    orderColumn: "created_at",
  }
);

export const dao = {
  ...standardDao,
  async findByDesign(
    trx: Knex.Transaction,
    designId: string
  ): Promise<ApprovalStepSubmission[]> {
    return adapter.fromDbArray(
      await trx(TABLE_NAME)
        .select("design_approval_submissions.*")
        .join(
          "design_approval_steps",
          "design_approval_steps.id",
          "design_approval_submissions.step_id"
        )
        .where({
          "design_approval_steps.design_id": designId,
        })
    );
  },
  async setAssignee(
    trx: Knex.Transaction,
    submissionId: string,
    collaboratorId: string
  ): Promise<ApprovalStepSubmission> {
    const sub = await standardDao.update(trx, submissionId, {
      collaboratorId,
    });

    return sub.updated;
  },
  async findByStep(
    trx: Knex.Transaction,
    stepId: string
  ): Promise<ApprovalStepSubmission[]> {
    return standardDao.find(trx, { stepId });
  },
};

export default dao;
export const {
  createAll,
  find,
  findById,
  findOne,
  update,
  findByDesign,
  setAssignee,
  findByStep,
} = dao;
