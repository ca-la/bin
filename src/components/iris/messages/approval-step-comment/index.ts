import { sendMessage } from "../../send-message";
import ApprovalStepComment from "../../../approval-step-comments/domain-object";
import { CommentWithResources } from "../../../comments/types";
import {
  realtimeApprovalStepCommentCreated,
  realtimeApprovalStepCommentDeleted,
} from "../../../approval-step-comments/realtime";

/**
 * Publishes an approval step comment to the Iris SQS.
 */
export async function announceApprovalStepCommentCreation(
  approvalStepComment: ApprovalStepComment,
  comment: CommentWithResources
): Promise<void> {
  await sendMessage(
    realtimeApprovalStepCommentCreated(approvalStepComment, comment)
  );
}

/**
 * Publishes an approval step comment deletion to the Iris SQS.
 */
export async function announceApprovalStepCommentDeletion(
  approvalStepComment: ApprovalStepComment
): Promise<void> {
  await sendMessage(realtimeApprovalStepCommentDeleted(approvalStepComment));
}
