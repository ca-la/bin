import Knex from "knex";

import {
  approvalStepSubmissionDomain,
  ApprovalStepSubmissionDb,
  ApprovalStepSubmissionDbRow,
  ApprovalStepSubmission,
  ApprovalStepSubmissionRow,
} from "./types";
import { buildDao } from "../../services/cala-component/cala-dao";
import { rawAdapter, adapter } from "./adapter";
import ResourceNotFoundError from "../../errors/resource-not-found";
import first from "../../services/first";
import db from "../../services/db";

const TABLE_NAME = "design_approval_submissions";

const rawDao = buildDao<ApprovalStepSubmissionDb, ApprovalStepSubmissionDbRow>(
  approvalStepSubmissionDomain,
  TABLE_NAME,
  rawAdapter,
  {
    orderColumn: "created_at",
  }
);

const standardDao = buildDao<ApprovalStepSubmission, ApprovalStepSubmissionRow>(
  approvalStepSubmissionDomain,
  TABLE_NAME,
  adapter,
  {
    orderColumn: "created_at",
    queryModifier: (query: Knex.QueryBuilder) =>
      query
        .select(db.raw(`count(submission_comments.*) as comment_count`))
        .leftJoin(
          "submission_comments",
          "submission_comments.submission_id",
          "design_approval_submissions.id"
        )
        .leftJoin("comments", "comments.id", "submission_comments.comment_id")
        .where({ "comments.deleted_at": null })
        .groupBy("design_approval_submissions.id"),
  }
);

export const dao = {
  ...standardDao,
  create: rawDao.create,
  createAll: rawDao.createAll,
  update: rawDao.update,
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
  ): Promise<ApprovalStepSubmissionDb> {
    const deleted: ApprovalStepSubmissionRow = await trx
      .from(TABLE_NAME)
      .where({ id, deleted_at: null })
      .update({ deleted_at: new Date().toISOString() }, "*")
      .then(first);

    if (!deleted) {
      throw new ResourceNotFoundError(`Submission "${id}" could not be found.`);
    }

    return rawAdapter.fromDb(deleted);
  },
};

export default dao;
export const {
  find,
  findById,
  findOne,
  findByDesign,
  findByStep,

  create,
  createAll,
  update,
  deleteById,
} = dao;
