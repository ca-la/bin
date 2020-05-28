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
  ],
});

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
  ],
});
