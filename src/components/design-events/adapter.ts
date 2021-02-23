import { buildAdapter } from "../../services/cala-component/cala-adapter";
import { BidTaskTypeId } from "../bid-task-types/types";
import DesignEvent, {
  DesignEventRow,
  DesignEventWithMeta,
  DesignEventWithMetaRow,
} from "./types";

function encode(row: DesignEventRow): DesignEvent {
  return {
    actorId: row.actor_id,
    approvalStepId: row.approval_step_id,
    approvalSubmissionId: row.approval_submission_id,
    bidId: row.bid_id,
    commentId: row.comment_id,
    createdAt: row.created_at,
    designId: row.design_id,
    id: row.id,
    quoteId: row.quote_id,
    shipmentTrackingEventId: row.shipment_tracking_event_id,
    shipmentTrackingId: row.shipment_tracking_id,
    targetId: row.target_id,
    targetTeamId: row.target_team_id,
    taskTypeId: row.task_type_id,
    type: row.type,
  };
}

function decode(data: DesignEvent): DesignEventRow {
  return {
    actor_id: data.actorId,
    approval_step_id: data.approvalStepId,
    approval_submission_id: data.approvalSubmissionId,
    bid_id: data.bidId,
    comment_id: data.commentId,
    created_at: data.createdAt,
    design_id: data.designId,
    id: data.id,
    quote_id: data.quoteId,
    shipment_tracking_event_id: data.shipmentTrackingEventId,
    shipment_tracking_id: data.shipmentTrackingId,
    target_id: data.targetId,
    target_team_id: data.targetTeamId,
    task_type_id: data.taskTypeId,
    type: data.type,
  };
}

export default buildAdapter<DesignEvent, DesignEventRow>({
  domain: "DesignEvent",
  requiredProperties: [],
  encodeTransformer: encode,
  decodeTransformer: decode,
});

function encodeWithMeta(row: DesignEventWithMetaRow): DesignEventWithMeta {
  return {
    ...encode(row),
    actorName: row.actor_name,
    actorRole: row.actor_role,
    actorEmail: row.actor_email,
    targetName: row.target_name,
    targetRole: row.target_role,
    targetEmail: row.target_email,
    targetTeamName: row.target_team_name,
    submissionTitle: row.submission_title,
    stepTitle: row.step_title,
    taskTypeId: row.task_type_id,
    taskTypeTitle: row.task_type_title ?? null,
    shipmentTrackingDescription: row.shipment_tracking_description,
    shipmentTrackingEventTag: row.shipment_tracking_event_tag,
    shipmentTrackingEventSubtag: row.shipment_tracking_event_subtag,
  };
}

function decodeWithMeta(data: DesignEventWithMeta): DesignEventWithMetaRow {
  return {
    ...decode(data),
    actor_name: data.actorName,
    actor_role: data.actorRole,
    actor_email: data.actorEmail,
    target_name: data.targetName,
    target_role: data.targetRole,
    target_email: data.targetEmail,
    target_team_name: data.targetTeamName,
    submission_title: data.submissionTitle,
    step_title: data.stepTitle,
    task_type_id: data.taskTypeId ? (data.taskTypeId as BidTaskTypeId) : null,
    task_type_title: data.taskTypeTitle,
    shipment_tracking_description: data.shipmentTrackingDescription,
    shipment_tracking_event_tag: data.shipmentTrackingEventTag,
    shipment_tracking_event_subtag: data.shipmentTrackingEventSubtag,
  };
}

export const withMetaAdapter = buildAdapter<
  DesignEventWithMeta,
  DesignEventWithMetaRow
>({
  domain: "DesignEventWithMeta",
  requiredProperties: [],
  encodeTransformer: encodeWithMeta,
  decodeTransformer: decodeWithMeta,
});
