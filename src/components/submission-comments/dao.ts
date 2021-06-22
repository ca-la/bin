import Knex from "knex";
import limitOrOffset from "../../services/limit-or-offset";
import { validateEvery } from "../../services/validate-from-db";
import {
  CommentQueryOptions,
  FindCommentsByIdOptions,
  queryComments,
} from "../comments/dao";
import {
  dataAdapter as commentDataAdapter,
  isCommentRow,
} from "../comments/domain-object";
import Comment from "../comments/types";

import adapter from "./adapter";
import { SubmissionComment, SubmissionCommentRow } from "./types";

const TABLE_NAME = "submission_comments";

const submissionCommentsView = (ktx: Knex, options: CommentQueryOptions) =>
  queryComments(ktx, options)
    .select("sc.submission_id as submission_id")
    .leftJoin("submission_comments AS sc", "sc.comment_id", "comments.id");

export async function create(
  trx: Knex.Transaction,
  data: SubmissionComment
): Promise<SubmissionComment> {
  const rowData = adapter.forInsertion(data);
  const insertedRows = await trx<SubmissionCommentRow>(TABLE_NAME)
    .insert(rowData)
    .returning("*");

  if (insertedRows.length === 0) {
    throw new Error("There was a problem saving the comment");
  }

  return adapter.fromDb(insertedRows[0]);
}

interface FindBySubmissionIdOptions extends FindCommentsByIdOptions {
  submissionId: string;
}

export async function findBySubmissionId(
  ktx: Knex,
  options: FindBySubmissionIdOptions
): Promise<Comment[]> {
  const {
    submissionId,
    limit,
    sortOrder,
    modify = (query: Knex.QueryBuilder) => query,
  } = options;

  const comments = await submissionCommentsView(ktx, {
    includeDeletedParents: true,
    sortOrder,
  })
    .where({ submission_id: submissionId })
    .orderBy("created_at", "asc")
    .groupBy("sc.submission_id")
    .modify(modify)
    .modify(limitOrOffset(limit));

  return validateEvery(TABLE_NAME, isCommentRow, commentDataAdapter, comments);
}
