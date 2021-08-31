import { omit } from "lodash";
import uuid = require("node-uuid");
import { TaskEvent, TaskStatus } from "@cala/ts-lib";

import DataAdapter from "../services/data-adapter";
import { hasOnlyProperties } from "../services/require-properties";
import {
  generatePreviewLinksFromDesignImageAssets,
  generateThumbnailLinksFromDesignImageAssets,
  ThumbnailAndPreviewLinks,
} from "../services/attach-asset-links";
import { encode as encodeCollaborator } from "../components/collaborators/domain-objects/collaborator";
import Collaborator, {
  CollaboratorWithUser,
  CollaboratorWithUserRow,
} from "../components/collaborators/types";
import { DesignImageAsset } from "../components/assets/types";

export interface RelatedResourceMeta {
  id: string | null;
  title: string | null;
  createdAt: Date | null;
}

export interface DesignResourceMeta extends RelatedResourceMeta {
  previewImageUrls: string[] | null;
  imageLinks: ThumbnailAndPreviewLinks[] | null;
}

export interface OrderedResourceMeta extends RelatedResourceMeta {
  ordering: number | null;
}

export interface DetailsTaskAdaptedRow extends Omit<TaskEvent, "taskId"> {
  designStageOrdering: number | null;
  designStageTitle: string | null;
  designId: string | null;
  designTitle: string | null;
  designCreatedAt: string | null;
  collectionId: string | null;
  collectionTitle: string | null;
  collectionCreatedAt: string | null;
  lastModifiedAt: Date;
  commentCount: number;
  imageAssets: DesignImageAsset[];
}

export interface DetailsTaskWithAssigneesAdaptedRow
  extends DetailsTaskAdaptedRow {
  assignees: CollaboratorWithUser[];
}

export const createDetailsTask = (
  data: DetailsTaskWithAssigneesAdaptedRow
): DetailsTaskWithAssignees => {
  const {
    designId,
    designTitle,
    designStageId,
    designStageOrdering,
    designStageTitle,
    designCreatedAt,
    collectionId,
    collectionTitle,
    collectionCreatedAt,
    commentCount,
    imageAssets,
    ...task
  } = data;
  return {
    ...task,
    collection: {
      createdAt: collectionCreatedAt ? new Date(collectionCreatedAt) : null,
      id: collectionId,
      title: collectionTitle,
    },
    commentCount: parseInt(commentCount.toString(), 10),
    design: {
      createdAt: designCreatedAt ? new Date(designCreatedAt) : null,
      id: designId,
      previewImageUrls: imageAssets
        ? generateThumbnailLinksFromDesignImageAssets(imageAssets)
        : null,
      imageLinks: imageAssets
        ? generatePreviewLinksFromDesignImageAssets(imageAssets)
        : null,
      title: designTitle,
    },
    designStage: {
      createdAt: null,
      id: designStageId,
      ordering: designStageOrdering,
      title: designStageTitle,
    },
    designStageId,
  };
};

export interface DetailsTask extends Omit<TaskEvent, "taskId"> {
  designStage: OrderedResourceMeta;
  design: DesignResourceMeta;
  collection: RelatedResourceMeta;
  commentCount: number;
  lastModifiedAt: Date;
}

export interface DetailsTaskWithAssignees extends DetailsTask {
  assignees: CollaboratorWithUser[];
}

export interface TaskEventRow {
  id: string;
  task_id: string;
  created_at: Date;
  created_by: string;
  title: string;
  description: string;
  status: TaskStatus;
  due_date: Date | null;
  ordering: number;
}

export const dataAdapter = new DataAdapter<TaskEventRow, TaskEvent>();

export function isTaskEvent(candidate: object): candidate is TaskEvent {
  return hasOnlyProperties(
    candidate,
    "id",
    "taskId",
    "createdAt",
    "createdBy",
    "title",
    "status",
    "dueDate",
    "description",
    "ordering"
  );
}

export function isTaskEventRow(row: object): row is TaskEventRow {
  return hasOnlyProperties(
    row,
    "id",
    "task_id",
    "created_at",
    "created_by",
    "title",
    "status",
    "due_date",
    "description",
    "ordering"
  );
}

export interface DetailTaskEventRow extends TaskEventRow {
  design_stage_id: string | null;
  design_stage_ordering: number | null;
  design_stage_title: string | null;
  design_id: string | null;
  design_title: string | null;
  collection_id: string | null;
  collection_title: string | null;
  comment_count: number;
  image_assets: DesignImageAsset[];
  last_modified_at: string;
}

export interface DetailTaskWithAssigneesEventRow extends DetailTaskEventRow {
  design_created_at: string | null;
  collection_created_at: string | null;
  assignees: CollaboratorWithUserRow[];
}

export function isDetailTaskRow(
  candidate: object
): candidate is DetailTaskEventRow {
  return hasOnlyProperties(
    candidate,
    "id",
    "created_at",
    "last_modified_at",
    "created_by",
    "title",
    "status",
    "due_date",
    "description",
    "design_stage_id",
    "design_stage_ordering",
    "design_stage_title",
    "design_id",
    "design_title",
    "collection_id",
    "collection_title",
    "comment_count",
    "image_assets",
    "ordering"
  );
}

export const detailsAdapter = new DataAdapter<
  DetailTaskEventRow,
  DetailsTaskAdaptedRow
>();

export function isDetailTaskWithAssigneeRow(
  candidate: object
): candidate is DetailTaskWithAssigneesEventRow {
  return hasOnlyProperties(
    candidate,
    "assignees",
    "id",
    "created_at",
    "last_modified_at",
    "created_by",
    "title",
    "status",
    "due_date",
    "description",
    "design_stage_id",
    "design_stage_ordering",
    "design_stage_title",
    "design_id",
    "design_title",
    "design_created_at",
    "collection_id",
    "collection_title",
    "collection_created_at",
    "comment_count",
    "image_assets",
    "ordering"
  );
}

const encode = (
  data: DetailTaskWithAssigneesEventRow
): DetailsTaskWithAssigneesAdaptedRow => {
  let assignees: CollaboratorWithUser[] = [];
  if (data.assignees) {
    assignees = data.assignees.map(encodeCollaborator);
  }

  return {
    assignees,
    collectionCreatedAt: data.collection_created_at,
    collectionId: data.collection_id,
    collectionTitle: data.collection_title,
    commentCount: data.comment_count,
    createdAt: new Date(data.created_at),
    lastModifiedAt: new Date(data.last_modified_at),
    createdBy: data.created_by,
    description: data.description,
    designCreatedAt: data.design_created_at,
    designId: data.design_id,
    designStageId: data.design_stage_id,
    designStageOrdering: data.design_stage_ordering,
    designStageTitle: data.design_stage_title,
    designTitle: data.design_title,
    dueDate: data.due_date,
    id: data.id,
    imageAssets: data.image_assets,
    ordering: data.ordering,
    status: data.status,
    title: data.title,
  };
};

export const detailsWithAssigneesAdapter = new DataAdapter<
  DetailTaskWithAssigneesEventRow,
  DetailsTaskWithAssigneesAdaptedRow
>(encode);

export type IOTask = DetailsTask & {
  assignees: Collaborator[];
  approvalStepId?: string;
};

export const taskEventFromIO = (request: IOTask, userId: string): TaskEvent => {
  const filteredRequest: TaskEvent = omit(
    { ...request, taskId: request.id },
    "assignees",
    "design",
    "designStage",
    "approvalStepId",
    "collection",
    "commentCount",
    "lastModifiedAt"
  );
  return {
    ...filteredRequest,
    createdAt: new Date(),
    createdBy: userId,
    id: uuid.v4(),
    status: request.status || TaskStatus.NOT_STARTED,
  };
};
