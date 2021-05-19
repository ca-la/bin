import Knex from "knex";
import db from "../../services/db";
import { queryComments } from "../comments/dao";
import {
  dataAdapter as commentDataAdapter,
  isCommentRow,
} from "../comments/domain-object";
import TaskComment, {
  dataAdapter,
  isTaskCommentRow,
  TaskCommentRow,
} from "./domain-object";
import { validate, validateEvery } from "../../services/validate-from-db";
import Comment, { CommentRow } from "../comments/types";

const TABLE_NAME = "task_comments";

export async function create(
  data: TaskComment,
  trx?: Knex.Transaction
): Promise<TaskComment> {
  const rowData = dataAdapter.forInsertion(data);
  const taskComments: TaskCommentRow[] = await db(TABLE_NAME)
    .insert(rowData)
    .returning("*")
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  const taskComment = taskComments[0];
  if (!data) {
    throw new Error("There was a problem saving the comment");
  }

  return validate<TaskCommentRow, TaskComment>(
    TABLE_NAME,
    isTaskCommentRow,
    dataAdapter,
    taskComment
  );
}

export async function findByTaskId(
  taskId: string,
  trx?: Knex.Transaction
): Promise<Comment[]> {
  const comments: CommentRow[] = await queryComments(trx, {
    includeDeletedParents: true,
  })
    .join("task_comments", "task_comments.comment_id", "comments.id")
    .leftJoin(
      "product_design_stage_tasks AS pdst",
      "pdst.task_id",
      "task_comments.task_id"
    )
    .leftJoin("product_design_stages AS pds", "pds.id", "pdst.design_stage_id")
    .leftJoin("collection_designs AS cd", "cd.design_id", "pds.design_id")
    .leftJoin("collections", "collections.id", "cd.collection_id")
    .where({
      "task_comments.task_id": taskId,
    });

  return validateEvery<CommentRow, Comment>(
    TABLE_NAME,
    isCommentRow,
    commentDataAdapter,
    comments
  );
}
