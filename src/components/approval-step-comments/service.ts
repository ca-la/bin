import Knex from "knex";
import { CommentWithAttachmentLinks } from "../../services/add-attachments-links";
import { CommentWithResources } from "../comments/types";
import {
  getCollaboratorsFromCommentMentions,
  getThreadUserIdsFromCommentThread,
} from "../../services/add-at-mention-details";
import * as NotificationsService from "../../services/create-notifications";
import { announceApprovalStepCommentCreation } from "../iris/messages/approval-step-comment";
import { create } from "./dao";

export async function createAndAnnounce(
  trx: Knex.Transaction,
  approvalStepId: string,
  comment: CommentWithAttachmentLinks
): Promise<CommentWithResources> {
  const approvalStepComment = await create(trx, {
    approvalStepId,
    commentId: comment.id,
  });

  const {
    mentionedUserIds,
    idNameMap,
  } = await getCollaboratorsFromCommentMentions(trx, comment.text);

  for (const mentionedUserId of mentionedUserIds) {
    await NotificationsService.sendApprovalStepCommentMentionNotification(trx, {
      approvalStepId,
      commentId: comment.id,
      actorId: comment.userId,
      recipientId: mentionedUserId,
    });
  }

  const threadUserIds: string[] =
    comment.parentCommentId && mentionedUserIds.length === 0
      ? await getThreadUserIdsFromCommentThread(trx, comment.parentCommentId)
      : [];

  for (const threadUserId of threadUserIds) {
    await NotificationsService.sendApprovalStepCommentReplyNotification(trx, {
      approvalStepId,
      commentId: comment.id,
      actorId: comment.userId,
      recipientId: threadUserId,
    });
  }

  await NotificationsService.sendDesignOwnerApprovalStepCommentCreateNotification(
    trx,
    approvalStepId,
    comment.id,
    comment.userId,
    mentionedUserIds,
    threadUserIds
  );

  const commentWithResources = { ...comment, mentions: idNameMap };
  await announceApprovalStepCommentCreation(
    approvalStepComment,
    commentWithResources
  );

  return commentWithResources;
}
