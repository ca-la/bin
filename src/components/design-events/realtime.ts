import { DesignEventWithMeta } from "./types";

export interface RealtimeDesignEventCreated {
  actorId: string;
  approvalStepId: string | null;
  resource: DesignEventWithMeta;
  type: "design-event/created";
}

export function isRealtimeDesignEventCreated(
  data: any
): data is RealtimeDesignEventCreated {
  return (
    "actorId" in data &&
    "approvalStepId" in data &&
    "resource" in data &&
    "type" in data &&
    data.type === "design-event/created"
  );
}

export function realtimeDesignEventCreated(
  designEvent: DesignEventWithMeta
): RealtimeDesignEventCreated {
  return {
    actorId: designEvent.actorId,
    approvalStepId: designEvent.approvalStepId,
    resource: designEvent,
    type: "design-event/created",
  };
}
