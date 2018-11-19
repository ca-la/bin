import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

import { CollaboratorRole } from '../services/find-collaborators';

export const DESIGN_PHASES = {
  POST_APPROVAL: 'POST_APPROVAL',
  POST_CREATION: 'POST_CREATION'
};

export type DesignPhase = keyof typeof DESIGN_PHASES;

export default interface TaskTemplate {
  id: string;
  stageTemplateId: string;
  assigneeRole: CollaboratorRole;
  designPhase: DesignPhase;
  title: string;
  description: string | null;
  ordering: number;
}

export interface TaskTemplateRow {
  id: string;
  stage_template_id: string;
  assignee_role: CollaboratorRole;
  design_phase: DesignPhase;
  title: string;
  description: string;
  ordering: number;
}

export const dataAdapter = new DataAdapter<TaskTemplateRow, TaskTemplate>();

export function isTaskTemplateRow(row: object): row is TaskTemplateRow {
  return hasProperties(
    row,
    'id',
    'stage_template_id',
    'assignee_role',
    'design_phase',
    'title',
    'description',
    'ordering'
  );
}
