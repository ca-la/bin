import { create } from "../../components/annotation-comments/dao";
import { BaseComment } from "../../published-types";
import generateComment from "./comment";
import generateAnnotation from "./product-design-canvas-annotation";

export async function generateAnnotationComment({
  annotationId,
  comment,
}: {
  annotationId?: string;
  comment?: Partial<BaseComment>;
} = {}) {
  const { comment: createdComment } = await generateComment(comment);

  const id = annotationId || (await generateAnnotation()).annotation.id;

  const annotationComment = await create({
    annotationId: id,
    commentId: createdComment.id,
  });
  return { comment: createdComment, annotationComment };
}
