import Knex from "knex";

import { Task, HandlerResult } from "../types";
import * as CommentsDAO from "../../../components/comments/dao";
import { announceAnnotationCommentDeletion } from "../../../components/iris/messages/annotation-comment";
import { announceApprovalStepCommentDeletion } from "../../../components/iris/messages/approval-step-comment";
import { announceSubmissionCommentDeletion } from "../../../components/iris/messages/submission-comment";

export async function postProcessDeleteComment(
  trx: Knex.Transaction,
  task: Task<"POST_PROCESS_DELETE_COMMENT">
): Promise<HandlerResult> {
  const {
    keys: { commentId, actorId },
  } = task;
  const withParentIds = await CommentsDAO.findWithParentIds(trx, commentId);

  if (withParentIds !== null) {
    const { annotationId, approvalStepId, submissionId } = withParentIds;

    if (annotationId) {
      await announceAnnotationCommentDeletion({
        actorId,
        annotationId,
        commentId,
      });
    } else if (submissionId) {
      await announceSubmissionCommentDeletion({
        actorId,
        submissionId,
        commentId,
      });
    } else if (approvalStepId) {
      await announceApprovalStepCommentDeletion({
        actorId,
        approvalStepId,
        commentId,
      });
    }
  }

  return {
    type: "SUCCESS",
    message: `POST_PROCESS_DELETE_COMMENT task successfully completed for comment ${commentId}.`,
  };
}
