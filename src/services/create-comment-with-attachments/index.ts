import Knex = require("knex");

import { BaseComment } from "../../components/comments/types";
import * as CommentsDAO from "../../components/comments/dao";
import * as AssetsDAO from "../../components/assets/dao";
import * as CommentAttachmentsDAO from "../../components/comment-attachments/dao";
import CommentAttachment from "../../components/comment-attachments/domain-object";
import Asset from "../../components/assets/types";
import {
  addAttachmentLinks,
  CommentWithAttachmentLinks,
} from "../add-attachments-links";

export async function createCommentWithAttachments(
  trx: Knex.Transaction,
  options: {
    comment: BaseComment;
    attachments: Asset[];
    userId: string;
  }
): Promise<CommentWithAttachmentLinks> {
  const { comment: baseComment, attachments, userId } = options;
  const comment = await CommentsDAO.create({ ...baseComment, userId }, trx);
  if (attachments.length === 0) {
    return comment as CommentWithAttachmentLinks;
  }
  await AssetsDAO.createAll(
    trx,
    attachments.map((attachment: Asset) => {
      return {
        ...attachment,
        createdAt: new Date(),
        uploadCompletedAt: attachment.uploadCompletedAt
          ? new Date(attachment.uploadCompletedAt)
          : null,
      };
    })
  );

  await CommentAttachmentsDAO.createAll(
    trx,
    attachments.map(
      (attachment: Asset): CommentAttachment => {
        return {
          assetId: attachment.id,
          commentId: comment.id,
        };
      }
    )
  );

  const foundComment = await CommentsDAO.findById(comment.id, trx);
  if (!foundComment) {
    throw new Error(`Could not find newly-created comment ${comment.id}`);
  }

  return addAttachmentLinks(foundComment);
}
