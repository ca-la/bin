import DataAdapter from '../services/data-adapter';
import { hasOnlyProperties } from '../services/require-properties';
import { generateThumbnailLinks } from '../services/attach-asset-links';
import {
  CollaboratorWithUser,
  CollaboratorWithUserRow,
  encode as encodeCollaborator
} from '../components/collaborators/domain-objects/collaborator';

/**
 * @typedef {object} TaskEvent A unit of work to be completed in the developement of a garment
 *
 * @property {string} id The unique row id
 * @property {string} taskId The id of the task
 * @property {Date} createdAt Date when this record was created
 * @property {string} createdBy The userId of the person who created the record
 * @property {string} title The task title
 * @property {TaskEventState} status The current status of the task
 * @property {Date} dueDate The current status of the task
 */
export default interface TaskEvent {
  dueDate: Date | null;
  status: TaskStatus | null;
  title: string;
  description: string;
  createdBy: string | null;
  taskId: string;
  createdAt: Date;
  id: string;
  designStageId: string | null;
  ordering: number;
}

export interface RelatedResourceMeta {
  id: string | null;
  title: string | null;
  createdAt: Date | null;
}

export interface DesignResourceMeta extends RelatedResourceMeta {
  previewImageUrls: string[] | null;
}

export interface OrderedResourceMeta extends RelatedResourceMeta {
  ordering: number | null;
}

export interface DetailsTaskAdaptedRow extends Omit<TaskEvent, 'taskId'> {
  designStageOrdering: number | null;
  designStageTitle: string | null;
  designId: string | null;
  designTitle: string | null;
  designCreatedAt: string | null;
  collectionId: string | null;
  collectionTitle: string | null;
  collectionCreatedAt: string | null;
  commentCount: number;
  imageIds: string[] | null;
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
    imageIds,
    ...task
  } = data;
  return {
    ...task,
    collection: {
      createdAt: collectionCreatedAt ? new Date(collectionCreatedAt) : null,
      id: collectionId,
      title: collectionTitle
    },
    commentCount: parseInt(commentCount.toString(), 10),
    design: {
      createdAt: designCreatedAt ? new Date(designCreatedAt) : null,
      id: designId,
      previewImageUrls: imageIds ? generateThumbnailLinks(imageIds) : null,
      title: designTitle
    },
    designStage: {
      createdAt: null,
      id: designStageId,
      ordering: designStageOrdering,
      title: designStageTitle
    },
    designStageId
  };
};

export interface DetailsTask extends Omit<TaskEvent, 'taskId'> {
  designStage: OrderedResourceMeta;
  design: DesignResourceMeta;
  collection: RelatedResourceMeta;
  commentCount: number;
}

export interface DetailsTaskWithAssignees extends DetailsTask {
  assignees: CollaboratorWithUser[];
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELETED = 'DELETED'
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
    'id',
    'taskId',
    'createdAt',
    'createdBy',
    'title',
    'status',
    'dueDate',
    'description',
    'designStageId',
    'ordering'
  );
}

export function isTaskEventRow(row: object): row is TaskEventRow {
  return hasOnlyProperties(
    row,
    'id',
    'task_id',
    'created_at',
    'created_by',
    'title',
    'status',
    'due_date',
    'description',
    'ordering'
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
  image_ids: string[] | null;
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
    'id',
    'created_at',
    'created_by',
    'title',
    'status',
    'due_date',
    'description',
    'design_stage_id',
    'design_stage_ordering',
    'design_stage_title',
    'design_id',
    'design_title',
    'collection_id',
    'collection_title',
    'comment_count',
    'image_ids',
    'ordering'
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
    'assignees',
    'id',
    'created_at',
    'created_by',
    'title',
    'status',
    'due_date',
    'description',
    'design_stage_id',
    'design_stage_ordering',
    'design_stage_title',
    'design_id',
    'design_title',
    'design_created_at',
    'collection_id',
    'collection_title',
    'collection_created_at',
    'comment_count',
    'image_ids',
    'ordering'
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
    imageIds: data.image_ids,
    ordering: data.ordering,
    status: data.status,
    title: data.title
  };
};

export const detailsWithAssigneesAdapter = new DataAdapter<
  DetailTaskWithAssigneesEventRow,
  DetailsTaskWithAssigneesAdaptedRow
>(encode);
