import * as Knex from 'knex';
import * as db from '../../services/db';
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

const TABLE_NAME = 'product_design_canvas_annotation_comments';
const VIEW_NAME = 'annotation_comments_view';

export async function create(
  data: AnnotationComment,
  trx?: Knex.Transaction
): Promise<AnnotationComment> {
  const rowData = dataAdapter.forInsertion(data);
  const annotationComments: AnnotationCommentRow[] = trx
    ? await db(TABLE_NAME).transacting(trx).insert(rowData).returning('*')
    : await db(TABLE_NAME).insert(rowData).returning('*');
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

export async function findByAnnotationId(annotationId: string): Promise<CommentWithMeta[]> {
  const comments: CommentWithMetaRow[] = await db(VIEW_NAME)
    .select('*')
    .from('annotation_comments_view')
    .where({ annotation_id: annotationId })
    .orderBy('created_at', 'asc');

  return validateEvery<CommentWithMetaRow, CommentWithMeta>(
    VIEW_NAME,
    isCommentWithMetaRow,
    commentWithMetaAdapter,
    comments
  );
}

interface AnnotationToComments {
  [annotationId: string]: CommentWithMeta[];
}

export async function findByAnnotationIds(annotationIds: string[]): Promise<AnnotationToComments> {
  const comments: CommentWithMetaRow[] = await db(VIEW_NAME)
    .select('*')
    .from('annotation_comments_view')
    .whereIn('annotation_id', annotationIds)
    .orderBy('created_at', 'asc');
  const validatedComments = validateEvery<CommentWithMetaRow, CommentWithMeta>(
    VIEW_NAME,
    isCommentWithMetaRow,
    commentWithMetaAdapter,
    comments
  );
  const commentsByAnnotation: AnnotationToComments = {};

  validatedComments.map((comment: CommentWithMeta): void => {
    const annotationId = comment.annotationId;
    const values = commentsByAnnotation[annotationId];
    if (values) {
      commentsByAnnotation[annotationId] = [...values, comment];
    } else {
      commentsByAnnotation[annotationId] = [comment];
    }
  });

  return commentsByAnnotation;
}
