import {
  RealtimeApprovalStepComment,
  RealtimeApprovalStepCommentDeletion,
} from "@cala/ts-lib";

import { sendMessage } from "../../send-message";
import ApprovalStepComment from "../../../approval-step-comments/domain-object";
import { CommentWithResources } from "../../../comments/types";

/**
 * Publishes an approval step comment to the Iris SQS.
 */
export async function announceApprovalStepCommentCreation(
  approvalStepComment: ApprovalStepComment,
  comment: CommentWithResources
): Promise<RealtimeApprovalStepComment> {
  const realtimeApprovalStepComment: RealtimeApprovalStepComment = {
    actorId: comment.userId,
    approvalStepId: approvalStepComment.approvalStepId,
    resource: comment,
    type: "approval-step-comment",
  };
  await sendMessage(realtimeApprovalStepComment);
  return realtimeApprovalStepComment;
}

/**
 * Publishes an approval step comment deletion to the Iris SQS.
 */
export async function announceApprovalStepCommentDeletion(options: {
  actorId: string;
  approvalStepId: string;
  commentId: string;
}): Promise<RealtimeApprovalStepCommentDeletion> {
  const { actorId, approvalStepId, commentId } = options;

  const realtimeApprovalStepCommentDeletion: RealtimeApprovalStepCommentDeletion = {
    actorId,
    approvalStepId,
    resource: { id: commentId },
    type: "approval-step-comment/delete",
  };
  await sendMessage(realtimeApprovalStepCommentDeletion);
  return realtimeApprovalStepCommentDeletion;
}
