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

export const getCollaboratorForComment = (
  query: Knex.QueryBuilder
): Knex.QueryBuilder =>
  query
    .select(
      db.raw(`
array_remove(
  array_agg(
    CASE
      WHEN co.id IS NOT null THEN jsonb_build_object('id', co.id, 'cancelled_at', co.cancelled_at)
      ELSE null
    END
  ),
  null
) AS collaborators
      `)
    )
    .leftJoin('product_design_canvas_annotations AS a', 'a.id', 'annotation_id')
    .leftJoin(
      'product_design_canvases AS canvases',
      'canvases.id',
      'a.canvas_id'
    )
    .leftJoin('product_designs AS d', 'd.id', 'canvases.design_id')
    .leftJoin('collection_designs AS cd', 'cd.design_id', 'd.id')
    .leftJoin('collections', 'collections.id', 'cd.collection_id')
    .joinRaw(
      'LEFT JOIN collaborators AS co ON (co.design_id = d.id OR co.collection_id = collections.id) AND co.user_id = c.user_id'
    )
    .groupBy('ac.annotation_id', 'c.id', 'u.name', 'u.email');
