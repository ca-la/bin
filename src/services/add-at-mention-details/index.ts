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
  ktx: Knex,
  commentText: string
): Promise<{
  idNameMap: Record<string, string | undefined>;
  mentionedUserIds: string[];
}> {
  const mentions = parseAtMentions(commentText);
  const idNameMap: Record<string, string | undefined> = {};
  const mentionedUserIds = [];

  for (const mention of mentions) {
    switch (mention.type) {
      case MentionType.COLLABORATOR: {
        const collaborator = await CollaboratorsDAO.findById(
          mention.id,
          true,
          ktx
        );

        const name = getDisplayName(collaborator);
        idNameMap[mention.id] = name;
        if (collaborator && collaborator.user) {
          mentionedUserIds.push(collaborator.user.id);
        }
        break;
      }

      case MentionType.TEAM_USER: {
        const teamUser = await TeamUsersDAO.findById(
          ktx,
          mention.id,
          (query: Knex.QueryBuilder) =>
            query.orWhereRaw("team_users.id = ? and deleted_at is not null", [
              mention.id,
            ])
        );

        if (!teamUser) {
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
  ktx: Knex,
  commentText: string
): Promise<Record<string, string | undefined>> {
  const { idNameMap } = await getCollaboratorsFromCommentMentions(
    ktx,
    commentText
  );

  return idNameMap;
}

export async function addAtMentionDetailsForComment(
  ktx: Knex,
  comment: Comment
): Promise<CommentWithMentions> {
  return {
    ...comment,
    mentions: await getMentionsFromComment(ktx, comment.text),
  };
}

/**
 * addAtMentionDetails takes a list of comments and attaches @-mention information to each comment
 * the information is a map of id's to resource names that will be displayed inline
 */
export default async function addAtMentionDetails(
  ktx: Knex,
  comments: Comment[]
): Promise<CommentWithMentions[]> {
  const commentsWithMentions: CommentWithMentions[] = [];

  for (const comment of comments) {
    commentsWithMentions.push(
      await addAtMentionDetailsForComment(ktx, comment)
    );
  }

  return commentsWithMentions;
}

export async function getThreadUserIdsFromCommentThread(
  trx: Knex.Transaction,
  parentCommentId: string
): Promise<string[]> {
  const parentComment = await CommentsDAO.findById(parentCommentId, trx, {
    includeDeletedParents: true,
  });
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
