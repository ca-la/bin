import Knex from "knex";
import { omit } from "lodash";

import Logger from "../../services/logger";
import * as AnnotationsDAO from "../../components/product-design-canvas-annotations/dao";
import * as AnnotationCommentsDAO from "../../components/annotation-comments/dao";
import * as CommentsDAO from "../../components/comments/dao";
import { AnnotationDb as Annotation } from "../../components/product-design-canvas-annotations/types";
import prepareForDuplication from "./prepare-for-duplication";
import Comment from "../../components/comments/types";

/**
 * Finds all comments associated with the given annotation, creates duplicates, and associates
 * the duplicates with the new annotation id.
 */
async function findAndDuplicateAnnotationComments(
  annotationId: string,
  newAnnotationId: string,
  trx: Knex.Transaction
): Promise<Comment[]> {
  const comments = await AnnotationCommentsDAO.findByAnnotationId(trx, {
    annotationId,
  });

  const originalCommentToDuplicatedCommentIdMap: Record<string, string> = {};
  const duplicatedComments: Comment[] = [];
  for (const comment of comments) {
    // original comments are in the ASC order so we can guarantee that
    // parent comments will be duplicated first and will be in the map
    // in time when we try to duplicate comments in the thread
    let parentCommentId: string | null = null;
    if (comment.parentCommentId) {
      parentCommentId =
        originalCommentToDuplicatedCommentIdMap[comment.parentCommentId];
      if (!parentCommentId) {
        // It's a non-fatal error if we cannot find the parent. Just skip this
        // comment to avoid weird side effects. Logging for now to have
        // visibility for if it ever happens.
        Logger.logServerError(
          `Could not find the parent comment for ${comment.id}`
        );
        continue;
      }
    }

    const duplicateComment = await CommentsDAO.create(
      {
        ...prepareForDuplication({ ...comment, parentCommentId }),
        // to keep the original order of comments
        createdAt: comment.createdAt,
      },
      trx,
      {
        excludeDeletedAt: false,
      }
    );

    originalCommentToDuplicatedCommentIdMap[comment.id] = duplicateComment.id;

    await AnnotationCommentsDAO.create(
      {
        annotationId: newAnnotationId,
        commentId: duplicateComment.id,
      },
      trx
    );

    duplicatedComments.push(duplicateComment);
  }

  return duplicatedComments;
}

/**
 * Finds all annotations for the given canvas and creates duplicates.
 * Duplication Tree:
 * Annotations --> AnnotationComments --> Comments.
 */
export async function findAndDuplicateAnnotations(
  canvasId: string,
  newCanvasId: string,
  trx: Knex.Transaction
): Promise<Annotation[]> {
  const annotations = await AnnotationsDAO.findAllByCanvasId(trx, canvasId);

  // create annotation duplicates.
  const duplicatedAnnotations: Annotation[] = [];
  for (const annotation of annotations) {
    const duplicateAnnotation = await AnnotationsDAO.create(
      trx,
      prepareForDuplication(
        omit(annotation, ["commentCount", "submissionCount"]),
        { canvasId: newCanvasId }
      )
    );

    await findAndDuplicateAnnotationComments(
      annotation.id,
      duplicateAnnotation.id,
      trx
    );

    duplicatedAnnotations.push(duplicateAnnotation);
  }

  return duplicatedAnnotations;
}
