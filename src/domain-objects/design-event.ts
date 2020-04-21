import DataAdapter from '../services/data-adapter';
import { hasProperties } from '../services/require-properties';
import { Role } from '../components/users/domain-object';

/**
 * A log entry for a quote and partner assignment event that occured on a design
 */

export type DesignEventTypes =
  | DesignerEvents
  | CALAEvents
  | PartnerEvents
  | ApprovalEvents;

type DesignerEvents =
  // Send the design to CALA initially for review
  | 'SUBMIT_DESIGN'
  // Commit to a certain quantity and price quote
  | 'COMMIT_QUOTE';

type CALAEvents =
  // Send a design to a partner for them to accept/reject
  | 'BID_DESIGN'
  // Indicate that we're unable to support producing this design
  | 'REJECT_DESIGN'
  // Indicate that we've set up the cost inputs for this design, so a designer
  // may now review them.
  | 'COMMIT_COST_INPUTS'
  // The opposite of BID_DESIGN; remove a partner
  | 'REMOVE_PARTNER'
  // Indicate if CALA has finalized pairing of a partner(s) to a design.
  | 'COMMIT_PARTNER_PAIRING';

type PartnerEvents = 'ACCEPT_SERVICE_BID' | 'REJECT_SERVICE_BID';

type ApprovalEvents = 'REVISION_REQUEST' | 'STEP_APPROVAL' | 'STEP_ASSIGNMENT';

export default interface DesignEvent {
  id: string;
  createdAt: Date;
  actorId: string;
  targetId: string | null;
  designId: string;
  bidId: string | null;
  quoteId: string | null;
  approvalStepId: string | null;
  type: DesignEventTypes;
}

export interface DesignEventRow {
  id: string;
  created_at: Date;
  actor_id: string;
  target_id: string | null;
  design_id: string;
  bid_id: string | null;
  quote_id: string | null;
  approval_step_id: string | null;
  type: DesignEventTypes;
}

export interface DesignEventWithUserMeta extends DesignEvent {
  actorName: string | null;
  actorRole: Role;
  actorEmail: string | null;
  targetName: string | null;
  targetRole: Role | null;
  targetEmail: string | null;
}

export interface DesignEventWithUserMetaRow extends DesignEventRow {
  actor_name: string | null;
  actor_role: Role;
  actor_email: string | null;
  target_name: string | null;
  target_role: Role | null;
  target_email: string | null;
}

export const dataAdapter = new DataAdapter<DesignEventRow, DesignEvent>();

export const withUserMetaDataAdapter = new DataAdapter<
  DesignEventWithUserMetaRow,
  DesignEventWithUserMeta
>();

export function isDesignEventRow(row: object): row is DesignEventRow {
  return hasProperties(
    row,
    'id',
    'created_at',
    'actor_id',
    'target_id',
    'design_id',
    'bid_id',
    'type',
    'quote_id',
    'approval_step_id'
  );
}

export function isDesignEvent(row: object): row is DesignEvent {
  return hasProperties(
    row,
    'id',
    'createdAt',
    'actorId',
    'targetId',
    'designId',
    'bidId',
    'type',
    'quoteId',
    'approvalStepId'
  );
}

export function isDesignEventWithUserMetaRow(
  row: object
): row is DesignEventWithUserMetaRow {
  return (
    isDesignEventRow(row) &&
    hasProperties(
      row,
      'actor_name',
      'actor_role',
      'actor_email',
      'target_name',
      'target_role',
      'target_email'
    )
  );
}

export function isDesignEventWithUserMeta(
  row: object
): row is DesignEventWithUserMeta {
  return (
    isDesignEvent(row) &&
    hasProperties(
      row,
      'actorName',
      'actorRole',
      'actorEmail',
      'targetName',
      'targetRole',
      'targetEmail'
    )
  );
}
