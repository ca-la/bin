import { RealtimeApprovalStepComment } from '@cala/ts-lib';
import { sendMessage } from '../../send-message';
import ApprovalStepComment from '../../../approval-step-comments/domain-object';
import addAtMentionDetails from '../../../../services/add-at-mention-details';
import { CommentWithAttachmentLinks } from '../../../../services/add-attachments-links';

/**
 * Publishes an approval step comment to the Iris SQS.
 */
export async function announceApprovalStepCommentCreation(
  approvalStepComment: ApprovalStepComment,
  comment: CommentWithAttachmentLinks
): Promise<RealtimeApprovalStepComment> {
  const commentWithMentions = await addAtMentionDetails([comment]);

  const realtimeApprovalStepComment: RealtimeApprovalStepComment = {
    actorId: comment.userId,
    approvalStepId: approvalStepComment.approvalStepId,
    resource: commentWithMentions[0],
    type: 'approval-step-comment'
  };
  await sendMessage(realtimeApprovalStepComment);
  return realtimeApprovalStepComment;
}
