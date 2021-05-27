import * as Knex from "knex";
import { CommentWithAttachmentLinks } from "../../services/add-attachments-links";
import { CommentWithResources } from "../comments/types";
import { addAtMentionDetailsForComment } from "../../services/add-at-mention-details";
import { announceAnnotationCommentCreation } from "../iris/messages/annotation-comment";
import sendCreationNotifications from "./send-creation-notifications";
import { create } from "./dao";

export async function createAndAnnounce(
  trx: Knex.Transaction,
  annotationId: string,
  comment: CommentWithAttachmentLinks
): Promise<CommentWithResources> {
  const annotationComment = await create(
    {
      annotationId,
      commentId: comment.id,
    },
    trx
  );

  const commentWithResources = (await addAtMentionDetailsForComment(
    trx,
    comment
  )) as CommentWithResources;

  await announceAnnotationCommentCreation(
    annotationComment,
    commentWithResources
  );
  await sendCreationNotifications(trx, {
    actorUserId: comment.userId,
    annotationId,
    comment,
  });

  return commentWithResources;
}
