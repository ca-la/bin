import { pick } from "lodash";
import db from "../../services/db";
import Knex from "knex";
import {
  baseDataAdapter,
  dataAdapter,
  INSERTABLE_COLUMNS,
  isCommentRow,
  UPDATABLE_COLUMNS,
} from "./domain-object";
import { validate, validateEvery } from "../../services/validate-from-db";
import Comment, { CommentRow, BaseComment } from "./types";
import * as ApprovalStepsDAO from "../approval-steps/dao";
import { NotFoundError, UserInputError } from "../../apollo";
import * as AnnotationsDAO from "../product-design-canvas-annotations/dao";
import * as CanvasesDAO from "../canvases/dao";

const TABLE_NAME = "comments";

export interface CommentQueryOptions {
  includeDeletedParents?: boolean;
  excludeDeletedAt?: boolean;
  sortOrder?: "asc" | "desc";
}

export function queryComments(
  ktx: Knex = db,
  options: CommentQueryOptions = {
    includeDeletedParents: false,
    excludeDeletedAt: true,
    sortOrder: "asc",
  }
): Knex.QueryBuilder {
  const query = ktx(TABLE_NAME)
    .select([
      "comments.*",
      { user_name: "users.name" },
      { user_email: "users.email" },
      { user_role: "users.role" },
    ])
    .select(
      ktx.raw(`
      coalesce(
        jsonb_agg(assets.*) filter (where assets.id is not null),
        '[]'
      ) as attachments`)
    )
    .join("users", "users.id", "comments.user_id")
    .leftJoin(
      "comment_attachments",
      "comment_attachments.comment_id",
      "comments.id"
    )
    .leftJoin("assets", "assets.id", "comment_attachments.asset_id")
    .groupBy("comments.id", "users.name", "users.email", "users.role")
    .orderBy("created_at", options.sortOrder || "asc")
    .orderBy("id", options.sortOrder || "asc");

  if (options.includeDeletedParents) {
    query.whereRaw(`
(
  (comments.deleted_at IS null) OR (
    comments.deleted_at IS NOT null and EXISTS (
      SELECT 1 FROM comments AS reply_comments
      WHERE reply_comments.parent_comment_id = comments.id AND reply_comments.deleted_at IS null
    )
  )
)
    `);
  } else if (options.excludeDeletedAt !== false) {
    query.where({ "comments.deleted_at": null });
  }

  return query;
}

export function queryById(
  id: string,
  trx?: Knex.Transaction,
  options?: CommentQueryOptions
): Knex.QueryBuilder {
  return queryComments(trx, options).where({ "comments.id": id }).first();
}

export async function create(
  data: BaseComment,
  trx?: Knex.Transaction,
  options?: CommentQueryOptions
): Promise<Comment> {
  const rowDataForInsertion = pick(
    baseDataAdapter.forInsertion(data),
    INSERTABLE_COLUMNS
  );
  await db(TABLE_NAME)
    .insert(rowDataForInsertion)
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
  const comment: CommentRow | undefined = await queryById(
    data.id,
    trx,
    options
  );

  if (!comment) {
    throw new Error("There was a problem saving the comment");
  }

  return validate<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    dataAdapter,
    comment
  );
}

export async function findById(
  id: string,
  trx?: Knex.Transaction,
  options?: CommentQueryOptions
): Promise<Comment | null> {
  const comment: CommentRow | undefined = await queryById(id, trx, options);

  if (!comment) {
    return null;
  }

  return validate<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    dataAdapter,
    comment
  );
}

export async function findByParentId(
  trx: Knex.Transaction,
  parentId: string
): Promise<Comment[]> {
  const comments = await queryComments(trx).where({
    "comments.parent_comment_id": parentId,
  });

  return validateEvery<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    dataAdapter,
    comments
  );
}

export async function update(
  data: Comment,
  trx?: Knex.Transaction
): Promise<Comment> {
  const rowDataForUpdate = pick(
    dataAdapter.forInsertion(data),
    UPDATABLE_COLUMNS
  );
  await db(TABLE_NAME)
    .where({ id: data.id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .update(rowDataForUpdate);

  const comment: CommentRow | undefined = await queryById(data.id, trx);

  if (!comment) {
    throw new Error("There was a problem saving the comment");
  }

  return validate<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    dataAdapter,
    comment
  );
}

export async function deleteById(
  id: string,
  trx?: Knex.Transaction
): Promise<void> {
  const deletedRows: number = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    })
    .update({ deleted_at: new Date().toISOString() });

  if (deletedRows === 0) {
    throw new Error(`No comment found with id ${id}`);
  }
}

export async function extractDesignIdFromCommentParent(
  ktx: Knex,
  input: { approvalStepId: string | null; annotationId: string | null }
): Promise<string> {
  if (input.approvalStepId && input.annotationId) {
    throw new UserInputError(
      "Comment should not have approvalStepId and annotationId simultaneously"
    );
  }

  if (input.approvalStepId) {
    const step = await ApprovalStepsDAO.findById(ktx, input.approvalStepId);
    if (!step) {
      throw new NotFoundError(`Step ${input.approvalStepId} not found`);
    }
    return step.designId;
  } else if (input.annotationId) {
    const annotation = await AnnotationsDAO.findById(input.annotationId);
    if (!annotation) {
      throw new NotFoundError(`Annotation ${input.annotationId} not found`);
    }
    const canvas = await CanvasesDAO.findById(annotation.canvasId, ktx);
    if (!canvas) {
      throw new NotFoundError(`Canvas ${annotation.canvasId} not found`);
    }
    return canvas.designId;
  } else {
    throw new UserInputError(
      `Comment should have approvalStepId or annotationId`
    );
  }
}
