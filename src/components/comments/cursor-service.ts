import Knex from "knex";

import addAtMentionDetails from "../../services/add-at-mention-details";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import { QueryModifier } from "../../services/cala-component/cala-dao";
import { CommentWithResourcesGraphQLType } from "./graphql-types";
import { transformMentionsToGraphQL } from "./service";
import Comment, { CommentWithResources, PaginatedComments } from "./types";

export async function addCommentResources(
  trx: Knex.Transaction,
  comments: Comment[]
): Promise<CommentWithResourcesGraphQLType[]> {
  const commentsWithMentions = await addAtMentionDetails(trx, comments);
  const commentsWithAttachments = commentsWithMentions.map(addAttachmentLinks);
  return commentsWithAttachments.map((comment: CommentWithResources) => ({
    ...comment,
    mentions: transformMentionsToGraphQL(comment.mentions),
  }));
}

export interface Cursor {
  createdAt: Date;
  id: string;
}

export function createCursor(data: { createdAt: Date; id: string }): string {
  return JSON.stringify({
    createdAt: data.createdAt,
    id: data.id,
  });
}

export function readCursor(data: string): Cursor {
  try {
    const cursor = JSON.parse(data);
    if (!cursor.createdAt || !cursor.id) {
      throw new Error("Invalid cursor");
    }
    return cursor;
  } catch (err) {
    throw new Error("Invalid cursor");
  }
}

export async function getNextPage({
  trx,
  comments,
  currentCursor,
  limit,
}: {
  trx: Knex.Transaction;
  comments: Comment[];
  currentCursor: string;
  limit: number;
}): Promise<PaginatedComments> {
  return {
    previousCursor: currentCursor,
    nextCursor:
      comments.length > limit + 1 ? createCursor(comments[limit]) : null,
    data: await addCommentResources(trx, comments.slice(1, limit + 1)),
  };
}

export async function getPreviousPage({
  trx,
  comments,
  currentCursor,
  limit,
}: {
  trx: Knex.Transaction;
  comments: Comment[];
  currentCursor?: string;
  limit: number;
}): Promise<PaginatedComments> {
  return {
    previousCursor:
      comments.length > limit ? createCursor(comments[limit]) : null,
    nextCursor: currentCursor || null,
    data: await addCommentResources(trx, comments.slice(0, limit).reverse()),
  };
}

export function createCommentPaginationModifier({
  cursor,
  sortOrder,
  parentCommentId,
}: {
  cursor: Cursor | null;
  sortOrder: "asc" | "desc";
  parentCommentId: string | null;
}): QueryModifier {
  return (query: Knex.QueryBuilder) => {
    if (cursor) {
      const { createdAt, id: commentId } = cursor;
      if (sortOrder === "asc") {
        query.whereRaw(
          `
          (
            comments.created_at > :createdAt
            OR (comments.created_at = :createdAt AND comments.id >= :commentId)
          )
          `,
          { createdAt, commentId }
        );
      } else {
        query.whereRaw(
          `
          (
            comments.created_at < :createdAt
            OR (comments.created_at = :createdAt AND comments.id <= :commentId)
          )
          `,
          { createdAt, commentId }
        );
      }
    }
    query.where({ "comments.parent_comment_id": parentCommentId });
    return query;
  };
}
