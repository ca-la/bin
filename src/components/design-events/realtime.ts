import { DesignEventWithMeta } from './types';

export interface RealtimeDesignEventCreated {
  actorId: string;
  approvalStepId: string;
  resource: DesignEventWithMeta;
  type: 'design-event/created';
}

export function isRealtimeDesignEventCreated(
  data: any
): data is RealtimeDesignEventCreated {
  return (
    'actorId' in data &&
    'approvalStepId' in data &&
    'resource' in data &&
    'type' in data &&
    data.type === 'design-event/created'
  );
}
