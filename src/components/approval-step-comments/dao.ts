import Knex, { QueryBuilder } from "knex";

import ApprovalStepComment, {
  ApprovalStepCommentRow,
  dataAdapter,
  isApprovalStepCommentRow,
} from "./domain-object";
import { validate, validateEvery } from "../../services/validate-from-db";
import {
  dataAdapter as commentDataAdapter,
  isCommentRow,
} from "../comments/domain-object";
import { FindCommentsByIdOptions, queryComments } from "../comments/dao";
import Comment, { CommentRow } from "../comments/types";

const TABLE_NAME = "design_approval_step_comments";

export async function create(
  trx: Knex.Transaction,
  data: ApprovalStepComment
): Promise<ApprovalStepComment> {
  const rowData = dataAdapter.forInsertion(data);
  const approvalStepComments: ApprovalStepCommentRow[] = await trx(TABLE_NAME)
    .insert(rowData)
    .returning("*");

  const approvalStepComment = approvalStepComments[0];

  if (!approvalStepComment) {
    throw new Error("There was a problem saving the comment");
  }

  return validate<ApprovalStepCommentRow, ApprovalStepComment>(
    TABLE_NAME,
    isApprovalStepCommentRow,
    dataAdapter,
    approvalStepComment
  );
}

interface FindByStepIdOptions extends FindCommentsByIdOptions {
  approvalStepId: string;
}

export async function findByStepId(
  ktx: Knex,
  options: FindByStepIdOptions
): Promise<Comment[]> {
  const {
    approvalStepId,
    limit,
    sortOrder,
    modify = (query: QueryBuilder) => query,
  } = options;

  const comments: CommentRow[] = await queryComments(ktx, {
    includeDeletedParents: true,
    sortOrder,
  })
    .join(
      "design_approval_step_comments",
      "design_approval_step_comments.comment_id",
      "comments.id"
    )
    .where({
      "design_approval_step_comments.approval_step_id": approvalStepId,
    })
    .modify(modify)
    .modify((query: Knex.QueryBuilder) => {
      if (limit) {
        query.limit(limit);
      }
    });

  return validateEvery<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    commentDataAdapter,
    comments
  );
}
