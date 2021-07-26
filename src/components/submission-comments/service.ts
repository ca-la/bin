import Knex from "knex";

import {
  BaseComment,
  CommentWithResources,
} from "../../components/comments/types";
import Asset from "../../components/assets/types";
import { createCommentWithAttachments } from "../../services/create-comment-with-attachments";
import {
  getCollaboratorsFromCommentMentions,
  getThreadUserIdsFromCommentThread,
} from "../../services/add-at-mention-details";
import * as NotificationsService from "../../services/create-notifications";
import * as SubmissionCommentsDAO from "./dao";
import { announceSubmissionCommentCreation } from "../iris/messages/submission-comment";

interface CreateSubmissionCommentOptions {
  comment: BaseComment;
  attachments: Asset[];
  userId: string;
  submissionId: string;
}

// TODO: add the "announce" part
export async function createAndAnnounce(
  trx: Knex.Transaction,
  options: CreateSubmissionCommentOptions
): Promise<CommentWithResources> {
  const { submissionId, ...baseOptions } = options;

  const comment = await createCommentWithAttachments(trx, baseOptions);

  const {
    mentionedUserIds,
    idNameMap: mentions,
  } = await getCollaboratorsFromCommentMentions(trx, comment.text);

  for (const mentionedUserId of mentionedUserIds) {
    await NotificationsService.sendApprovalStepSubmissionCommentMentionNotification(
      trx,
      {
        approvalSubmissionId: submissionId,
        commentId: comment.id,
        actorId: comment.userId,
        recipientId: mentionedUserId,
      }
    );
  }

  const threadUserIds: string[] =
    comment.parentCommentId && mentionedUserIds.length === 0
      ? await getThreadUserIdsFromCommentThread(trx, comment.parentCommentId)
      : [];

  for (const threadUserId of threadUserIds) {
    await NotificationsService.sendApprovalStepSubmissionCommentReplyNotification(
      trx,
      {
        approvalSubmissionId: submissionId,
        commentId: comment.id,
        actorId: comment.userId,
        recipientId: threadUserId,
      }
    );
  }

  await NotificationsService.sendDesignOwnerApprovalStepSubmissionCommentCreateNotification(
    trx,
    submissionId,
    comment.id,
    comment.userId,
    mentionedUserIds,
    threadUserIds
  );

  const commentWithResources = {
    ...comment,
    mentions,
  };

  const submissionComment = await SubmissionCommentsDAO.create(trx, {
    submissionId,
    commentId: comment.id,
  });

  await announceSubmissionCommentCreation(
    submissionComment,
    commentWithResources
  );

  return commentWithResources;
}
