import Knex from "knex";

import ApprovalStepSubmission, {
  ApprovalStepSubmissionRow,
  approvalStepSubmissionDomain,
} from "./types";
import { buildDao } from "../../services/cala-component/cala-dao";
import adapter from "./adapter";
import ResourceNotFoundError from "../../errors/resource-not-found";
import first from "../../services/first";

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
    ktx: Knex,
    designId: string
  ): Promise<ApprovalStepSubmission[]> {
    return standardDao.find(ktx, {}, (query: Knex.QueryBuilder) =>
      query
        .join(
          "design_approval_steps",
          "design_approval_steps.id",
          "design_approval_submissions.step_id"
        )
        .where({
          "design_approval_steps.design_id": designId,
          "design_approval_submissions.deleted_at": null,
        })
    );
  },
  async findByStep(
    ktx: Knex,
    stepId: string
  ): Promise<ApprovalStepSubmission[]> {
    return standardDao.find(ktx, { stepId });
  },
  async deleteById(
    trx: Knex.Transaction,
    id: string
  ): Promise<ApprovalStepSubmission> {
    const deleted: ApprovalStepSubmissionRow = await trx
      .from(TABLE_NAME)
      .where({ id, deleted_at: null })
      .update({ deleted_at: new Date().toISOString() }, "*")
      .then(first);

    if (!deleted) {
      throw new ResourceNotFoundError(`Submission "${id}" could not be found.`);
    }

    return adapter.fromDb(deleted);
  },
};

export default dao;
export const {
  create,
  createAll,
  find,
  findById,
  findOne,
  update,
  findByDesign,
  findByStep,
  deleteById,
} = dao;
