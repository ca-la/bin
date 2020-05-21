import { Role } from "../users/types";

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
  | "SUBMIT_DESIGN"
  // Commit to a certain quantity and price quote
  | "COMMIT_QUOTE";

type CALAEvents =
  // Send a design to a partner for them to accept/reject
  | "BID_DESIGN"
  // Indicate that we're unable to support producing this design
  | "REJECT_DESIGN"
  // Indicate that we've set up the cost inputs for this design, so a designer
  // may now review them.
  | "COMMIT_COST_INPUTS"
  // The opposite of BID_DESIGN; remove a partner
  | "REMOVE_PARTNER"
  // Indicate if CALA has finalized pairing of a partner(s) to a design.
  | "COMMIT_PARTNER_PAIRING";

type PartnerEvents = "ACCEPT_SERVICE_BID" | "REJECT_SERVICE_BID";

type ApprovalEvents =
  | "REVISION_REQUEST"
  | "STEP_ASSIGNMENT"
  | "STEP_SUMBISSION_APPROVAL"
  | "STEP_SUMBISSION_ASSIGNMENT"
  | "STEP_COMPLETE"
  | "STEP_REOPEN";

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
  approvalSubmissionId: string | null;
  commentId: string | null;
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
  approval_submission_id: string | null;
  comment_id: string | null;
}

export interface DesignEventWithMeta extends DesignEvent {
  actorName: string | null;
  actorRole: Role;
  actorEmail: string | null;
  targetName: string | null;
  targetRole: Role | null;
  targetEmail: string | null;
  submissionTitle: string | null;
  stepTitle: string | null;
  taskTypeId: string | null;
  taskTypeTitle: string | null;
}

export interface DesignEventWithMetaRow extends DesignEventRow {
  actor_name: string | null;
  actor_role: Role;
  actor_email: string | null;
  target_name: string | null;
  target_role: Role | null;
  target_email: string | null;
  submission_title: string | null;
  step_title: string | null;
  task_type_id: string | null;
  task_type_title: string | null;
}

export const domain = "DesignEvent" as "DesignEvent";
