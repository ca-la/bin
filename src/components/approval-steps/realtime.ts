import { z } from "zod";
import { buildChannelName } from "../iris/build-channel";
import ApprovalStep, { serializedApprovalStepSchema } from "./types";

export const realtimeApprovalStepUpdatedSchema = z.object({
  resource: serializedApprovalStepSchema,
  type: z.literal("approval-step/updated"),
  channels: z.array(z.string()),
});
export type RealtimeApprovalStepUpdated = z.infer<
  typeof realtimeApprovalStepUpdatedSchema
>;

export function realtimeApprovalStepUpdated(
  step: ApprovalStep
): RealtimeApprovalStepUpdated {
  return {
    type: "approval-step/updated",
    channels: [buildChannelName("approval-steps", step.id)],
    resource: step,
  };
}

export const realtimeApprovalStepListUpdatedSchema = z.object({
  type: z.literal("approval-step-list/updated"),
  resource: z.array(serializedApprovalStepSchema),
  channels: z.array(z.string()),
});
export type RealtimeApprovalStepListUpdated = z.infer<
  typeof realtimeApprovalStepListUpdatedSchema
>;

export function realtimeApprovalStepListUpdated(
  collectionId: string,
  steps: ApprovalStep[]
): RealtimeApprovalStepListUpdated {
  return {
    type: "approval-step-list/updated",
    resource: steps,
    channels: [buildChannelName("collections", collectionId)],
  };
}
