import * as Knex from 'knex';
import * as db from '../../services/db';

export const ALIASES = {
  collaboratorId: 'collaborators_forcollaboratorsviewraw.id',
  userId: 'users_forcollaboratorsviewraw.id'
};

export const annotationCommentsView = (): Knex.QueryBuilder =>
  db
    .select(
      'ac.annotation_id AS annotation_id',
      'c.*',
      'u.name AS user_name',
      'u.email AS user_email'
    )
    .from('comments as c')
    .leftJoin(
      'product_design_canvas_annotation_comments AS ac',
      'ac.comment_id',
      'c.id'
    )
    .leftJoin('users AS u', 'u.id', 'c.user_id')
    .where({ 'c.deleted_at': null })
    .whereNot({ 'ac.annotation_id': null });
