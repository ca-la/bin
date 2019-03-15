import Comment from '../../components/comments/domain-object';
import parseAtMentions, {
  MentionMeta,
  MentionType
} from '@cala/ts-lib/dist/parsing/comment-mentions';
import * as CollaboratorsDAO from '../../components/collaborators/dao';

export interface CommentWithMentions extends Comment {
  mentions: { [id: string]: string };
}

export async function addAtMentionDetailsForComment(
  comment: Comment
): Promise<CommentWithMentions> {
  const mentionMatches = parseAtMentions(comment.text);
  if (mentionMatches.length > 0) {
    const mentions = await mentionMatches.reduce(
      async (accPromise: Promise<{ [id: string]: string }>, match: MentionMeta) => {
        const acc = await accPromise;
        if (match.type === MentionType.collaborator) {
          const collaborator = await CollaboratorsDAO.findById(match.id);
          if (!collaborator) {
            return acc;
          }
          return ({
            ...acc,
            [match.id]: collaborator.user
            ? collaborator.user.name
            : collaborator.userEmail || 'Unknown'
          });
        }
        return acc;
      },
      Promise.resolve({})
    );
    return {
      ...comment,
      mentions
    };
  }
  return {
    ...comment,
    mentions: {}
  };
}

/**
 * addAtMentionDetails takes a list of comments and attaches @-mention information to each comment
 * the information is a map of id's to resource names that will be displayed inline
 * currently the only supported @-mention type supported is collaborator
 */
export default async function addAtMentionDetails(
  comments: Comment[]
): Promise<CommentWithMentions[]> {
  return Promise.all(
    comments.map(
      async (comment: Comment): Promise<CommentWithMentions> => {
        return await addAtMentionDetailsForComment(comment);
      }
    )
  );
}
