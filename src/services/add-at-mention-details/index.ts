import Comment from "../../components/comments/types";
import parseAtMentions, {
  MentionMeta,
  MentionType,
} from "@cala/ts-lib/dist/parsing/comment-mentions";
import Knex from "knex";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import * as CommentsDAO from "../../components/comments/dao";
import { CollaboratorWithUser } from "../../components/collaborators/types";

export interface CommentWithMentions extends Comment {
  mentions: { [id: string]: string };
}

/**
 * Constructs the name to add to the @mention detail.
 */
export function constructCollaboratorName(
  collaborator: CollaboratorWithUser | null
): string {
  if (!collaborator) {
    return "Unknown";
  }

  const { user, userEmail } = collaborator;
  return (user && user.name) || userEmail || "Unknown";
}

export async function addAtMentionDetailsForComment(
  comment: Comment
): Promise<CommentWithMentions> {
  const mentionMatches = parseAtMentions(comment.text);
  const mentions = await mentionMatches.reduce(
    async (
      accPromise: Promise<{ [id: string]: string }>,
      match: MentionMeta
    ) => {
      const acc = await accPromise;
      if (match.type === MentionType.collaborator) {
        const collaborator = await CollaboratorsDAO.findById(match.id, true);
        const name = constructCollaboratorName(collaborator);
        return {
          ...acc,
          [match.id]: name,
        };
      }
      return acc;
    },
    Promise.resolve({})
  );
  return {
    ...comment,
    mentions,
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

export async function getMentionsFromComment(
  commentText: string
): Promise<Record<string, string>> {
  const mentionMatches = parseAtMentions(commentText);
  return mentionMatches.reduce(
    async (
      accPromise: Promise<{ [id: string]: string }>,
      match: MentionMeta
    ) => {
      const acc = await accPromise;
      if (match.type === MentionType.collaborator) {
        const collaborator = await CollaboratorsDAO.findById(match.id, true);
        const name = constructCollaboratorName(collaborator);
        return {
          ...acc,
          [match.id]: name,
        };
      }
      return acc;
    },
    Promise.resolve({})
  );
}

export async function getCollaboratorsFromCommentMentions(
  trx: Knex.Transaction,
  commentText: string
): Promise<{
  collaboratorNames: { [collaboratorId: string]: string };
  mentionedUserIds: string[];
}> {
  const mentions = parseAtMentions(commentText);
  const collaboratorNames: { [key: string]: string } = {};
  const mentionedUserIds = [];

  for (const mention of mentions) {
    switch (mention.type) {
      case MentionType.collaborator: {
        const collaborator = await CollaboratorsDAO.findById(
          mention.id,
          false,
          trx
        );

        if (!collaborator) {
          throw new Error(`Cannot find mentioned collaborator ${mention.id}`);
        }

        if (!collaborator.user) {
          continue;
        }

        const name = constructCollaboratorName(collaborator);
        collaboratorNames[collaborator.id] = name;
        mentionedUserIds.push(collaborator.user.id);
      }
    }
  }
  return { collaboratorNames, mentionedUserIds };
}

export async function getThreadUserIdsFromCommentThread(
  trx: Knex.Transaction,
  parentCommentId: string
): Promise<string[]> {
  const parentComment = await CommentsDAO.findById(parentCommentId);
  if (!parentComment) {
    throw new Error(`Could not find comment ${parentCommentId}`);
  }

  const threadUserIds = [];

  // Notify the parent of the comment
  threadUserIds.push(parentComment.userId);

  // Notify the participants in the comment thread
  const comments = await CommentsDAO.findByParentId(trx, parentComment.id);
  for (const threadComment of comments) {
    if (!threadUserIds.includes(threadComment.userId)) {
      threadUserIds.push(threadComment.userId);
    }
  }
  return threadUserIds;
}
