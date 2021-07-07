import * as z from "zod";
import { userRoleSchema } from "../users/types";
import { bidTaskTypeIdSchema } from "../bid-task-types/types";

const designerEvents = z.enum(["SUBMIT_DESIGN", "COMMIT_QUOTE"]);
const calaEvents = z.enum([
  "BID_DESIGN",
  "REJECT_DESIGN",
  "COMMIT_COST_INPUTS",
  "REMOVE_PARTNER",
  "COMMIT_PARTNER_PAIRING",
  "COSTING_EXPIRATION",
]);
const partnerEvents = z.enum(["ACCEPT_SERVICE_BID", "REJECT_SERVICE_BID"]);
const shipmentTrackingEvents = z.enum(["TRACKING_CREATION", "TRACKING_UPDATE"]);
const approvalEvents = z.enum([
  "REVISION_REQUEST",
  "STEP_ASSIGNMENT",
  "STEP_UNASSIGNMENT",
  "STEP_SUBMISSION_APPROVAL",
  "STEP_SUBMISSION_ASSIGNMENT",
  "STEP_SUBMISSION_UNASSIGNMENT",
  "STEP_SUBMISSION_RE_REVIEW_REQUEST",
  "STEP_SUBMISSION_UNSTARTED",
  "STEP_COMPLETE",
  "STEP_REOPEN",
  "STEP_PARTNER_PAIRING",
]);
export const allEventsSchema = z.enum([
  ...designerEvents.options,
  ...calaEvents.options,
  ...partnerEvents.options,
  ...shipmentTrackingEvents.options,
  ...approvalEvents.options,
]);
export type DesignEventTypes = z.infer<typeof allEventsSchema>;

export const activityStreamEventsSchema = z.enum([
  allEventsSchema.enum.REVISION_REQUEST,
  allEventsSchema.enum.STEP_ASSIGNMENT,
  allEventsSchema.enum.STEP_UNASSIGNMENT,
  allEventsSchema.enum.STEP_SUBMISSION_APPROVAL,
  allEventsSchema.enum.STEP_SUBMISSION_ASSIGNMENT,
  allEventsSchema.enum.STEP_SUBMISSION_UNASSIGNMENT,
  allEventsSchema.enum.STEP_SUBMISSION_RE_REVIEW_REQUEST,
  allEventsSchema.enum.STEP_SUBMISSION_UNSTARTED,
  allEventsSchema.enum.STEP_COMPLETE,
  allEventsSchema.enum.STEP_PARTNER_PAIRING,
  allEventsSchema.enum.STEP_REOPEN,
  allEventsSchema.enum.SUBMIT_DESIGN,
  allEventsSchema.enum.COMMIT_QUOTE,
  allEventsSchema.enum.COMMIT_COST_INPUTS,
  allEventsSchema.enum.COSTING_EXPIRATION,
  allEventsSchema.enum.TRACKING_CREATION,
  allEventsSchema.enum.TRACKING_UPDATE,
]);
export type ActivityStreamEventType = z.infer<
  typeof activityStreamEventsSchema
>;

export const designEventSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  actorId: z.string(),
  targetId: z.string().nullable(),
  targetTeamId: z.string().nullable(),
  designId: z.string(),
  bidId: z.string().nullable(),
  quoteId: z.string().nullable(),
  approvalStepId: z.string().nullable(),
  type: allEventsSchema,
  approvalSubmissionId: z.string().nullable(),
  commentId: z.string().nullable(),
  taskTypeId: z.string().nullable(),
  shipmentTrackingId: z.string().nullable(),
  shipmentTrackingEventId: z.string().nullable(),
});
export type DesignEvent = z.infer<typeof designEventSchema>;
export default DesignEvent;

export const serializedDesignEventSchema = designEventSchema.extend({
  createdAt: z.string(),
});
export type SerializedDesignEvent = z.infer<typeof serializedDesignEventSchema>;

export const designEventRowSchema = z.object({
  id: z.string(),
  created_at: z.date(),
  actor_id: z.string(),
  target_id: z.string().nullable(),
  target_team_id: z.string().nullable(),
  design_id: z.string(),
  bid_id: z.string().nullable(),
  quote_id: z.string().nullable(),
  approval_step_id: z.string().nullable(),
  type: allEventsSchema,
  approval_submission_id: z.string().nullable(),
  comment_id: z.string().nullable(),
  task_type_id: z.string().nullable(),
  shipment_tracking_id: z.string().nullable(),
  shipment_tracking_event_id: z.string().nullable(),
});
export type DesignEventRow = z.infer<typeof designEventRowSchema>;

export const serializedDesignEventRowSchema = designEventRowSchema.extend({
  created_at: z
    .string()
    .transform((dateString: string) => new Date(dateString)),
});
export type SerializedDesignEventRow = z.infer<
  typeof serializedDesignEventRowSchema
>;

export const designEventWithMetaSchema = designEventSchema.extend({
  actorName: z.string().nullable(),
  actorRole: userRoleSchema,
  actorEmail: z.string().nullable(),
  targetName: z.string().nullable(),
  targetRole: userRoleSchema.nullable(),
  targetEmail: z.string().nullable(),
  targetTeamName: z.string().nullable(),
  submissionTitle: z.string().nullable(),
  stepTitle: z.string().nullable(),
  taskTypeId: z.string().nullable(),
  taskTypeTitle: z.string().nullable(),
  shipmentTrackingDescription: z.string().nullable(),
  shipmentTrackingEventTag: z.string().nullable(),
  shipmentTrackingEventSubtag: z.string().nullable(),
});
export type DesignEventWithMeta = z.infer<typeof designEventWithMetaSchema>;

export const designEventWithMetaRowSchema = designEventRowSchema.extend({
  actor_name: z.string().nullable(),
  actor_role: userRoleSchema,
  actor_email: z.string().nullable(),
  target_name: z.string().nullable(),
  target_role: userRoleSchema.nullable(),
  target_email: z.string().nullable(),
  target_team_name: z.string().nullable(),
  submission_title: z.string().nullable(),
  step_title: z.string().nullable(),
  task_type_id: bidTaskTypeIdSchema.nullable(),
  task_type_title: z.string().nullable().optional(),
  shipment_tracking_description: z.string().nullable(),
  shipment_tracking_event_tag: z.string().nullable(),
  shipment_tracking_event_subtag: z.string().nullable(),
});
export type DesignEventWithMetaRow = z.infer<
  typeof designEventWithMetaRowSchema
>;

export const templateDesignEvent = {
  targetId: null,
  targetTeamId: null,
  bidId: null,
  quoteId: null,
  approvalStepId: null,
  approvalSubmissionId: null,
  commentId: null,
  taskTypeId: null,
  shipmentTrackingId: null,
  shipmentTrackingEventId: null,
};

export const templateDesignEventWithMeta = {
  ...templateDesignEvent,
  actorName: null,
  actorEmail: null,
  targetName: null,
  targetRole: null,
  targetEmail: null,
  targetTeamName: null,
  submissionTitle: null,
  stepTitle: null,
  taskTypeId: null,
  taskTypeTitle: null,
  shipmentTrackingDescription: null,
  shipmentTrackingEventTag: null,
  shipmentTrackingEventSubtag: null,
};

export const domain = "DesignEvent" as "DesignEvent";
export const withMetaDomain = "DesignEventWithMeta" as "DesignEventWithMeta";
