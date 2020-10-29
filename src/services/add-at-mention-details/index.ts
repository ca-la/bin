import Knex from "knex";

import Comment, {
  CommentWithMentions,
  MentionType,
} from "../../components/comments/types";
import { parseAtMentions } from "../../components/comments/service";
import TeamUsersDAO from "../../components/team-users/dao";
import * as CollaboratorsDAO from "../../components/collaborators/dao";
import * as CommentsDAO from "../../components/comments/dao";
import { User } from "../../components/users/types";

function getDisplayName(
  data: { userEmail: string | null; user?: User | null } | null
): string {
  let displayName = "Unknown";

  if (data) {
    const { user, userEmail } = data;

    if (user) {
      if (user.name) {
        displayName = user.name;
      } else if (user.email) {
        displayName = user.email;
      }
    } else if (userEmail) {
      displayName = userEmail;
    }
  }

  return displayName;
}

export async function getCollaboratorsFromCommentMentions(
  trx: Knex.Transaction,
  commentText: string
): Promise<{
  idNameMap: { [id: string]: string };
  mentionedUserIds: string[];
}> {
  const mentions = parseAtMentions(commentText);
  const idNameMap: { [key: string]: string } = {};
  const mentionedUserIds = [];

  for (const mention of mentions) {
    switch (mention.type) {
      case MentionType.COLLABORATOR: {
        const collaborator = await CollaboratorsDAO.findById(
          mention.id,
          true,
          trx
        );

        const name = getDisplayName(collaborator);
        idNameMap[mention.id] = name;
        if (collaborator && collaborator.user) {
          mentionedUserIds.push(collaborator.user.id);
        }
        break;
      }

      case MentionType.TEAM_USER: {
        const teamUser = await TeamUsersDAO.findById(trx, mention.id);
        if (!teamUser || !teamUser.user) {
          continue;
        }

        const name = getDisplayName(teamUser);
        idNameMap[mention.id] = name;
        if (teamUser && teamUser.user) {
          mentionedUserIds.push(teamUser.user.id);
        }
        break;
      }
    }
  }
  return { idNameMap, mentionedUserIds };
}

export async function getMentionsFromComment(
  trx: Knex.Transaction,
  commentText: string
): Promise<Record<string, string>> {
  const { idNameMap } = await getCollaboratorsFromCommentMentions(
    trx,
    commentText
  );

  return idNameMap;
}

export async function addAtMentionDetailsForComment(
  trx: Knex.Transaction,
  comment: Comment
): Promise<CommentWithMentions> {
  return {
    ...comment,
    mentions: await getMentionsFromComment(trx, comment.text),
  };
}

/**
 * addAtMentionDetails takes a list of comments and attaches @-mention information to each comment
 * the information is a map of id's to resource names that will be displayed inline
 */
export default async function addAtMentionDetails(
  trx: Knex.Transaction,
  comments: Comment[]
): Promise<CommentWithMentions[]> {
  const commentsWithMentions: CommentWithMentions[] = [];

  for (const comment of comments) {
    commentsWithMentions.push(
      await addAtMentionDetailsForComment(trx, comment)
    );
  }

  return commentsWithMentions;
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
