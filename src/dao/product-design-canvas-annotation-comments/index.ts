import * as Knex from 'knex';
import * as db from '../../services/db';
import Comment, {
  CommentRow,
  dataAdapter as commentAdapter,
  isCommentRow
} from '../../components/comments/domain-object';
import AnnotationComment, {
  AnnotationCommentRow,
  dataAdapter,
  isAnnotationCommentRow
} from '../../domain-objects/product-design-canvas-annotation-comment';
import { validate, validateEvery } from '../../services/validate-from-db';

const TABLE_NAME = 'product_design_canvas_annotation_comments';

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

export async function findByAnnotationId(annotationId: string): Promise<Comment[] | null> {
  const comments: CommentRow[] = await db
    .select(['comments.*', { user_name: 'users.name' }, { user_email: 'users.email' }])
    .from('comments')
    .join(
      'product_design_canvas_annotation_comments',
      'product_design_canvas_annotation_comments.comment_id',
      'comments.id'
    )
    .join('users', 'users.id', 'comments.user_id')
    .where({
      'comments.deleted_at': null,
      'product_design_canvas_annotation_comments.annotation_id': annotationId
    })
    .orderBy('comments.created_at', 'asc');

  return validateEvery<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    commentAdapter,
    comments
  );
}
