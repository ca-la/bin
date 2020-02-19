import Comment from '../../components/comments/domain-object';
import {
  AssetLinks,
  constructAttachmentAssetLinks
} from '../attach-asset-links';
import Asset from '../../components/assets/domain-object';

interface CommentWithAttachmentLinks extends Comment {
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
        ...constructAttachmentAssetLinks(attachment)
      };
    })
  };
}
