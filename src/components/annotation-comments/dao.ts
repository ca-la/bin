import * as Knex from "knex";

import db from "../../services/db";
import { validate, validateEvery } from "../../services/validate-from-db";
import { addAtMentionDetailsForComment } from "../../services/add-at-mention-details";
import { addAttachmentLinks } from "../../services/add-attachments-links";
import { CommentWithMentions } from "../comments/types";

import AnnotationComment, {
  AnnotationCommentRow,
  CommentWithMeta,
  CommentWithMetaRow,
  dataAdapter,
  isAnnotationCommentRow,
  isCommentWithMetaRow,
  withMetaDataAdapter as commentWithMetaAdapter,
} from "./domain-object";
import { annotationCommentsView } from "./view";
import { FindCommentsByIdOptions } from "../comments/dao";

const TABLE_NAME = "product_design_canvas_annotation_comments";

export async function create(
  data: AnnotationComment,
  trx?: Knex.Transaction
): Promise<AnnotationComment> {
  const rowData = dataAdapter.forInsertion(data);
  const annotationComments: AnnotationCommentRow[] = await db(TABLE_NAME)
    .insert(rowData)
    .returning("*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
  const annotationComment = annotationComments[0];

  if (!annotationComment) {
    throw new Error("There was a problem saving the comment");
  }

  return validate<AnnotationCommentRow, AnnotationComment>(
    TABLE_NAME,
    isAnnotationCommentRow,
    dataAdapter,
    annotationComment
  );
}

interface FindByAnnotationIdOptions extends FindCommentsByIdOptions {
  annotationId: string;
}

export async function findByAnnotationId(
  ktx: Knex,
  options: FindByAnnotationIdOptions
): Promise<CommentWithMeta[]> {
  const {
    annotationId,
    limit,
    sortOrder,
    modify = (query: Knex.QueryBuilder) => query,
  } = options;

  const comments: CommentWithMetaRow[] = await annotationCommentsView(ktx, {
    includeDeletedParents: true,
    sortOrder,
  })
    .where({
      annotation_id: annotationId,
    })
    .clearOrder()
    .orderBy("created_at", sortOrder || "ASC")
    .orderByRaw("parent_comment_id ASC NULLS FIRST")
    .orderBy("id", sortOrder || "ASC")
    .groupBy("ac.annotation_id")
    .modify(modify)
    .modify((query: Knex.QueryBuilder) => {
      if (limit) {
        query.limit(limit);
      }
    });

  return validateEvery<CommentWithMetaRow, CommentWithMeta>(
    TABLE_NAME,
    isCommentWithMetaRow,
    commentWithMetaAdapter,
    comments
  );
}

export interface AnnotationToCommentsWithMentions {
  [annotationId: string]: CommentWithMentions[];
}

export async function findByAnnotationIds(
  ktx: Knex,
  annotationIds: string[]
): Promise<AnnotationToCommentsWithMentions> {
  const comments: CommentWithMetaRow[] = await annotationCommentsView(ktx, {
    includeDeletedParents: true,
  })
    .whereIn("annotation_id", annotationIds)
    .orderBy("created_at", "asc")
    .groupBy("ac.annotation_id");

  const validatedComments = validateEvery<CommentWithMetaRow, CommentWithMeta>(
    TABLE_NAME,
    isCommentWithMetaRow,
    commentWithMetaAdapter,
    comments
  );

  const commentsByAnnotation: AnnotationToCommentsWithMentions = {};
  for (const validatedComment of validatedComments) {
    const { annotationId, ...baseComment } = validatedComment;
    const baseCommentWithAttachments = addAttachmentLinks(baseComment);
    const baseCommentWithMentions = await addAtMentionDetailsForComment(
      ktx,
      baseCommentWithAttachments
    );

    const values = commentsByAnnotation[annotationId];
    if (values) {
      commentsByAnnotation[annotationId] = [...values, baseCommentWithMentions];
    } else {
      commentsByAnnotation[annotationId] = [baseCommentWithMentions];
    }
  }

  return commentsByAnnotation;
}
