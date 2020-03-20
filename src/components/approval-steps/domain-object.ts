import DataAdapter from '../../services/data-adapter';
import { hasProperties } from '../../services/require-properties';

export default interface ApprovalStep {
  id: string;
  title: string;
  ordering: number;
  designId: string;
}

export interface ApprovalStepRow {
  id: string;
  title: string;
  ordering: number;
  design_id: string;
}

export const dataAdapter = new DataAdapter<ApprovalStepRow, ApprovalStep>();

export function isApprovalStepRow(
  candidate: any
): candidate is ApprovalStepRow {
  return hasProperties(candidate, 'id', 'title', 'ordering', 'design_id');
}
