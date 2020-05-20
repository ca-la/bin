import Knex from "knex";

import * as AnnotationsDAO from "../../components/product-design-canvas-annotations/dao";
import * as AnnotationCommentsDAO from "../../components/annotation-comments/dao";
import * as CommentsDAO from "../../components/comments/dao";
import Annotation from "../../components/product-design-canvas-annotations/domain-object";
import prepareForDuplication from "./prepare-for-duplication";
import Comment from "../../components/comments/domain-object";

/**
 * Finds all comments associated with the given annotation, creates duplicates, and associates
 * the duplicates with the new annotation id.
 */
async function findAndDuplicateAnnotationComments(
  annotationId: string,
  newAnnotationId: string,
  trx: Knex.Transaction
): Promise<Comment[]> {
  const comments =
    (await AnnotationCommentsDAO.findByAnnotationId(annotationId)) || [];

  return Promise.all(
    comments.map(async (comment: Comment) => {
      const duplicateComment = await CommentsDAO.create(
        prepareForDuplication(comment),
        trx
      );
      await AnnotationCommentsDAO.create(
        {
          annotationId: newAnnotationId,
          commentId: duplicateComment.id,
        },
        trx
      );
      return duplicateComment;
    })
  );
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
  const annotations = await AnnotationsDAO.findAllByCanvasId(canvasId);

  // create annotation duplicates.
  return Promise.all(
    annotations.map(
      async (annotation: Annotation): Promise<Annotation> => {
        const duplicateAnnotation = await AnnotationsDAO.create(
          prepareForDuplication(annotation, { canvasId: newCanvasId }),
          trx
        );

        await findAndDuplicateAnnotationComments(
          annotation.id,
          duplicateAnnotation.id,
          trx
        );

        return duplicateAnnotation;
      }
    )
  );
}
