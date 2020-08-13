import { buildAdapter } from "../../services/cala-component/cala-adapter";
import DesignEvent, {
  DesignEventRow,
  domain,
  DesignEventWithMeta,
  DesignEventWithMetaRow,
} from "./types";

export default buildAdapter<DesignEvent, DesignEventRow>({
  domain,
  requiredProperties: [
    "id",
    "createdAt",
    "actorId",
    "targetId",
    "designId",
    "bidId",
    "type",
    "quoteId",
    "approvalStepId",
    "approvalSubmissionId",
    "commentId",
    "shipmentTrackingId",
  ],
});

function withMetaEncode(row: DesignEventWithMetaRow): DesignEventWithMeta {
  return {
    id: row.id,
    createdAt: row.created_at,
    actorId: row.actor_id,
    targetId: row.target_id,
    designId: row.design_id,
    bidId: row.bid_id,
    type: row.type,
    quoteId: row.quote_id,
    approvalStepId: row.approval_step_id,
    approvalSubmissionId: row.approval_submission_id,
    commentId: row.comment_id,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    actorEmail: row.actor_email,
    targetName: row.target_name,
    targetRole: row.target_role,
    targetEmail: row.target_email,
    submissionTitle: row.submission_title,
    stepTitle: row.step_title,
    shipmentTrackingId: row.shipment_tracking_id,
    shipmentTrackingDescription: row.shipment_tracking_description,
    taskTypeId: row.task_type_id,
    taskTypeTitle: null,
  };
}

export const withMetaAdapter = buildAdapter<
  DesignEventWithMeta,
  DesignEventWithMetaRow
>({
  domain,
  requiredProperties: [
    "id",
    "createdAt",
    "actorId",
    "targetId",
    "designId",
    "bidId",
    "type",
    "quoteId",
    "approvalStepId",
    "approvalSubmissionId",
    "commentId",
    "actorName",
    "actorRole",
    "actorEmail",
    "targetName",
    "targetRole",
    "targetEmail",
    "submissionTitle",
    "stepTitle",
    "shipmentTrackingId",
    "shipmentTrackingDescription",
  ],
  encodeTransformer: withMetaEncode,
});
