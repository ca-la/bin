import { z } from "zod";
import { buildChannelName } from "../iris/build-channel";
import {
  DesignEventWithMeta,
  serializedDesignEventWithMetaSchema,
} from "./types";

export const realtimeDesignEventCreatedSchema = z.object({
  resource: serializedDesignEventWithMetaSchema,
  type: z.literal("design-event/created"),
  channels: z.array(z.string()),
});

export type RealtimeDesignEventCreated = z.infer<
  typeof realtimeDesignEventCreatedSchema
>;

export function realtimeDesignEventCreated(
  designEvent: DesignEventWithMeta
): RealtimeDesignEventCreated {
  const channels = [buildChannelName("designs", designEvent.designId)];

  if (designEvent.approvalStepId) {
    channels.push(
      buildChannelName("approval-steps", designEvent.approvalStepId)
    );
  }

  if (designEvent.approvalSubmissionId) {
    channels.push(
      buildChannelName("submissions", designEvent.approvalSubmissionId)
    );
  }

  return {
    resource: designEvent,
    type: "design-event/created",
    channels,
  };
}
