import Comment from "../../components/comments/types";
import { constructAttachmentAssetLinks } from "../attach-asset-links";
import Asset, { AssetLinks } from "../../components/assets/types";

export interface CommentWithAttachmentLinks extends Comment {
  attachments: (Asset & AssetLinks)[];
}

export function addAttachmentLinks(
  comment: Comment
): CommentWithAttachmentLinks {
  if (comment.attachments.length === 0) {
    return comment as CommentWithAttachmentLinks;
  }
  return {
    ...comment,
    attachments: comment.attachments.map((attachment: Asset) => {
      return {
        ...attachment,
        ...constructAttachmentAssetLinks(attachment),
      };
    }),
  };
}
