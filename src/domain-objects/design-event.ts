import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';

/**
 * A log entry for a quote and partner assignment event that occured on a design
 */

export type DesignEventTypes =
  | DesignerEvents
  | CALAEvents
  | PartnerEvents;

type DesignerEvents =
  | 'SUBMIT_DESIGN';
type CALAEvents =
  | 'BID_DESIGN'
  | 'REJECT_DESIGN'
  | 'QUOTE_DESIGN'
  | 'REMOVE_PARTNER';
type PartnerEvents =
  | 'ACCEPT_SERVICE_BID'
  | 'REJECT_SERVICE_BID';

export default interface DesignEvent {
  id: string;
  createdAt: Date;
  actorId: string;
  targetId: string | null;
  designId: string;
  type: DesignEventTypes;
}

export interface DesignEventRow {
  id: string;
  created_at: Date;
  actor_id: string;
  target_id: string | null;
  design_id: string;
  type: DesignEventTypes;
}

export const dataAdapter = new DataAdapter<DesignEventRow, DesignEvent>();

export function isDesignEventRow(row: object): row is DesignEventRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'actor_id',
    'target_id',
    'design_id',
    'type'
  );
}

export function isDesignEvent(row: object): row is DesignEventRow {
  return hasProperties(
    row,
    'id',
    'createdAt',
    'actorId',
    'targetId',
    'designId',
    'type'
  );
}
