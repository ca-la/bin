import {
  RealtimeAnnotationComment,
  RealtimeAnnotationCommentDeletion,
} from "@cala/ts-lib";
import Knex from "knex";
import { sendMessage } from "../../send-message";
import AnnotationComment from "../../../annotation-comments/domain-object";
import addAtMentionDetails from "../../../../services/add-at-mention-details";
import { CommentWithAttachmentLinks } from "../../../../services/add-attachments-links";

/**
 * Publishes an annotation comment to the Iris SQS.
 */
export async function announceAnnotationCommentCreation(
  trx: Knex.Transaction,
  annotationComment: AnnotationComment,
  comment: CommentWithAttachmentLinks
): Promise<RealtimeAnnotationComment> {
  const commentWithMentions = await addAtMentionDetails(trx, [comment]);

  const realtimeAnnotationComment: RealtimeAnnotationComment = {
    actorId: comment.userId,
    annotationId: annotationComment.annotationId,
    resource: commentWithMentions[0],
    type: "annotation-comment",
  };
  await sendMessage(realtimeAnnotationComment);
  return realtimeAnnotationComment;
}

/**
 * Publishes an annotation comment deletion to the Iris SQS.
 */
export async function announceAnnotationCommentDeletion(options: {
  actorId: string;
  annotationId: string;
  commentId: string;
}): Promise<RealtimeAnnotationCommentDeletion> {
  const { actorId, annotationId, commentId } = options;

  const realtimeAnnotationCommentDeletion: RealtimeAnnotationCommentDeletion = {
    actorId,
    annotationId,
    resource: { id: commentId },
    type: "annotation-comment/delete",
  };
  await sendMessage(realtimeAnnotationCommentDeletion);
  return realtimeAnnotationCommentDeletion;
}
