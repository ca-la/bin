import Knex from "knex";

import ApprovalStepComment, {
  ApprovalStepCommentRow,
  dataAdapter,
  isApprovalStepCommentRow,
} from "./domain-object";
import { validate, validateEvery } from "../../services/validate-from-db";
import Comment, {
  CommentRow,
  dataAdapter as commentDataAdapter,
  isCommentRow,
} from "../comments/domain-object";
import { queryComments } from "../comments/dao";

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

export async function findByStepId(
  trx: Knex.Transaction,
  stepId: string
): Promise<Comment[]> {
  const comments: CommentRow[] = await queryComments(trx)
    .join(
      "design_approval_step_comments",
      "design_approval_step_comments.comment_id",
      "comments.id"
    )
    .where({
      "design_approval_step_comments.approval_step_id": stepId,
    });

  return validateEvery<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    commentDataAdapter,
    comments
  );
}
