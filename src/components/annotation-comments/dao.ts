import * as Knex from 'knex';
import db from '../../services/db';
import AnnotationComment, {
  AnnotationCommentRow,
  CommentWithMeta,
  CommentWithMetaRow,
  dataAdapter,
  isAnnotationCommentRow,
  isCommentWithMetaRow,
  withMetaDataAdapter as commentWithMetaAdapter
} from './domain-object';
import { validate, validateEvery } from '../../services/validate-from-db';
import {
  addAtMentionDetailsForComment,
  CommentWithMentions
} from '../../services/add-at-mention-details';
import { annotationCommentsView } from './view';

const TABLE_NAME = 'product_design_canvas_annotation_comments';

export async function create(
  data: AnnotationComment,
  trx?: Knex.Transaction
): Promise<AnnotationComment> {
  const rowData = dataAdapter.forInsertion(data);
  const annotationComments: AnnotationCommentRow[] = await db(TABLE_NAME)
    .insert(rowData)
    .returning('*')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
  const annotationComment = annotationComments[0];

  if (!annotationComment) {
    throw new Error('There was a problem saving the comment');
  }

  return validate<AnnotationCommentRow, AnnotationComment>(
    TABLE_NAME,
    isAnnotationCommentRow,
    dataAdapter,
    annotationComment
  );
}

export async function findByAnnotationId(
  annotationId: string,
  trx?: Knex.Transaction
): Promise<CommentWithMeta[]> {
  const comments: CommentWithMetaRow[] = await annotationCommentsView(trx)
    .where({
      annotation_id: annotationId
    })
    .orderBy('created_at', 'asc');

  return validateEvery<CommentWithMetaRow, CommentWithMeta>(
    TABLE_NAME,
    isCommentWithMetaRow,
    commentWithMetaAdapter,
    comments
  );
}

interface AnnotationToCommentsWithMentions {
  [annotationId: string]: CommentWithMentions[];
}

export async function findByAnnotationIds(
  annotationIds: string[],
  trx?: Knex.Transaction
): Promise<AnnotationToCommentsWithMentions> {
  const comments: CommentWithMetaRow[] = await annotationCommentsView(trx)
    .whereIn('annotation_id', annotationIds)
    .orderBy('created_at', 'asc');

  const validatedComments = validateEvery<CommentWithMetaRow, CommentWithMeta>(
    TABLE_NAME,
    isCommentWithMetaRow,
    commentWithMetaAdapter,
    comments
  );

  const commentsByAnnotation: AnnotationToCommentsWithMentions = {};
  for (const validatedComment of validatedComments) {
    const { annotationId, ...baseComment } = validatedComment;
    const baseCommentWithMentions = await addAtMentionDetailsForComment(
      baseComment
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
