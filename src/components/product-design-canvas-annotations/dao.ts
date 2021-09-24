import Knex from "knex";
import { pick } from "lodash";
import db from "../../services/db";
import ResourceNotFoundError from "../../errors/resource-not-found";
import first from "../../services/first";

import {
  AnnotationDb,
  Annotation,
  AnnotationRow,
  AnnotationDbRow,
} from "./types";
import { adapter, rawAdapter } from "./adapter";

const TABLE_NAME = "product_design_canvas_annotations";

export const UPDATABLE_PROPERTIES: (keyof AnnotationDb)[] = [
  "canvasId",
  "x",
  "y",
];

const withCounts = (ktx: Knex) => (query: Knex.QueryBuilder) =>
  query.select([
    "product_design_canvas_annotations.*",
    ktx.raw(`
(
SELECT count(product_design_canvas_annotation_comments.*)
  FROM product_design_canvas_annotation_comments
       JOIN comments ON comments.id = product_design_canvas_annotation_comments.comment_id
 WHERE comments.deleted_at IS NULL
   AND product_design_canvas_annotation_comments.annotation_id = product_design_canvas_annotations.id
) AS comment_count
`),
    ktx.raw(`
(
SELECT count(design_approval_submissions.*)
  FROM design_approval_submissions
 WHERE design_approval_submissions.deleted_at IS NULL
   AND design_approval_submissions.annotation_id = product_design_canvas_annotations.id
) AS submission_count
`),
  ]);

export async function findById(
  ktx: Knex,
  id: string
): Promise<Annotation | null> {
  const annotationRow = await ktx(TABLE_NAME)
    .modify(withCounts(ktx))
    .where({ id, deleted_at: null })
    .first();

  return annotationRow ? adapter.fromDb(annotationRow) : null;
}

export async function create(
  trx: Knex.Transaction,
  data: Uninserted<AnnotationDb>
): Promise<Annotation> {
  const rowData = rawAdapter.toDbPartial({
    ...data,
    deletedAt: null,
  });

  await trx(TABLE_NAME).insert(rowData);

  const found = await findById(trx, data.id);

  if (!found) {
    throw new Error(`There was a problem creating Annotation ${data.id}`);
  }

  return found;
}

export async function update(
  id: string,
  data: AnnotationDb
): Promise<Annotation> {
  const rowData = rawAdapter.toDbPartial(pick(data, UPDATABLE_PROPERTIES));
  await db(TABLE_NAME).where({ id, deleted_at: null }).update(rowData);

  const updated = await findById(db, id);

  if (!updated) {
    throw new Error("Failed to update row");
  }

  return updated;
}

export async function deleteById(id: string): Promise<AnnotationDb> {
  const deleted = await db(TABLE_NAME)
    .where({ id, deleted_at: null })
    .update({ deleted_at: new Date() }, "*")
    .then(first);

  if (!deleted) {
    throw new ResourceNotFoundError("Failed to delete row");
  }

  return rawAdapter.fromDb(deleted);
}

export async function findAllByCanvasId(
  ktx: Knex,
  canvasId: string
): Promise<Annotation[]> {
  const rows: AnnotationRow[] = await ktx(TABLE_NAME)
    .select("product_design_canvas_annotations.*")
    .where({ canvas_id: canvasId, deleted_at: null })
    .modify(withCounts(ktx))
    .orderBy("created_at", "desc");

  return adapter.fromDbArray(rows);
}

export async function findNotEmptyByDesign(
  ktx: Knex,
  designId: string
): Promise<Annotation[]> {
  const rows: AnnotationRow[] = await ktx(TABLE_NAME)
    .distinct("product_design_canvas_annotations.id")
    .select("product_design_canvas_annotations.*")
    .joinRaw(
      `
JOIN (
  SELECT annotations.id as annotation_id
    FROM product_design_canvas_annotations AS annotations
         LEFT JOIN product_design_canvas_annotation_comments
                ON product_design_canvas_annotation_comments.annotation_id = annotations.id
         LEFT JOIN comments
                ON comments.id = product_design_canvas_annotation_comments.comment_id
               AND comments.deleted_at IS NULL
         LEFT JOIN design_approval_submissions
                ON design_approval_submissions.annotation_id = annotations.id
               AND design_approval_submissions.deleted_at IS NULL
   WHERE product_design_canvas_annotation_comments.annotation_id IS NOT NULL
      OR design_approval_submissions.id IS NOT NULL
) AS annotation_content ON annotation_content.annotation_id = product_design_canvas_annotations.id
`
    )
    .join(
      "canvases",
      "canvases.id",
      "product_design_canvas_annotations.canvas_id"
    )
    .whereRaw(
      `
canvases.design_id = ?
AND canvases.deleted_at IS NULL
AND product_design_canvas_annotations.deleted_at IS null
`,
      [designId]
    )
    .modify(withCounts(ktx))
    .orderBy("product_design_canvas_annotations.created_at", "desc");

  return adapter.fromDbArray(rows);
}

export async function findAllWithCommentsByCanvasId(
  ktx: Knex,
  canvasId: string
): Promise<AnnotationDb[]> {
  const annotations: AnnotationDbRow[] = await ktx(TABLE_NAME)
    .distinct("product_design_canvas_annotations.id")
    .select("product_design_canvas_annotations.*")
    .join(
      "product_design_canvas_annotation_comments",
      "product_design_canvas_annotation_comments.annotation_id",
      "product_design_canvas_annotations.id"
    )
    .join(
      "comments",
      "comments.id",
      "product_design_canvas_annotation_comments.comment_id"
    )
    .whereRaw(
      `
product_design_canvas_annotations.canvas_id = ?
AND product_design_canvas_annotations.deleted_at IS null
AND comments.deleted_at IS null
    `,
      [canvasId]
    )
    .orderBy("product_design_canvas_annotations.created_at", "desc");

  return rawAdapter.fromDbArray(annotations);
}
