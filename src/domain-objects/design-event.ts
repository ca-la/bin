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
  // Send the design to CALA initially for review
  'SUBMIT_DESIGN';

type CALAEvents =
  // Send a design to a partner for them to accept/reject
  | 'BID_DESIGN'
  // Indicate that we're unable to support producing this design
  | 'REJECT_DESIGN'
  // Indicate that we've set up the cost inputs for this design, so a designer
  // may now review them.
  | 'COMMIT_COST_INPUTS'
  // The opposite of BID_DESIGN; remove a partner
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
  bidId: string | null;
  type: DesignEventTypes;
}

export interface DesignEventRow {
  id: string;
  created_at: Date;
  actor_id: string;
  target_id: string | null;
  design_id: string;
  bid_id: string | null;
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
    'bid_id',
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
    'bidId',
    'type'
  );
}
