import Knex from "knex";
import { queryComments, CommentQueryOptions } from "../comments/dao";

export const ALIASES = {
  collaboratorId: "collaborators_forcollaboratorsviewraw.id",
  userId: "users_forcollaboratorsviewraw.id",
};

export const annotationCommentsView = (
  ktx?: Knex,
  options?: CommentQueryOptions
): Knex.QueryBuilder =>
  queryComments(ktx, options)
    .select("ac.annotation_id AS annotation_id")
    .leftJoin(
      "product_design_canvas_annotation_comments AS ac",
      "ac.comment_id",
      "comments.id"
    )
    .whereNot({ "ac.annotation_id": null });
