import Knex from "knex";

import ApprovalStepSubmission, {
  ApprovalStepSubmissionRow,
  approvalStepSubmissionDomain,
} from "./types";
import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";

const TABLE_NAME = "design_approval_submissions";

const standardDao = buildDao<ApprovalStepSubmission, ApprovalStepSubmissionRow>(
  approvalStepSubmissionDomain,
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
  findByStep,
} = dao;
