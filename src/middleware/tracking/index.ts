import { ParameterizedContext } from "koa";
import uuid from "node-uuid";
import { performance } from "perf_hooks";

import * as Analytics from "../../services/analytics";

const UUID_REGEX = /[\w]{8}-[\w]{4}-[\w]{4}-[\w]{4}-[\w]{12}/g;

export interface TrackingEvent {
  timestamp: string;
  event: string;
  payload: Record<string, any>;
}

export interface TrackingState {
  tracking: TrackingEvent[];
  trackingId: string;
}

export function* track(this: PublicContext, next: any) {
  this.state.trackingId = uuid.v4();
  this.state.tracking = [];

  const start = performance.now();
  yield next;
  const totalMs = performance.now() - start;
  const path = this.originalUrl.replace(UUID_REGEX, ":id");

  trackEvent(this, `timing/${this.request.method} ${path}`, { totalMs });

  if (this.state.tracking.length > 0) {
    Analytics.batch(
      this.state.tracking.map((tracking: TrackingEvent) => ({
        eventName: `[ROUTE] ${tracking.event}`,
        payload: {
          trackingId: this.state.trackingId,
          tracking: JSON.stringify(tracking.payload),
          value: tracking.payload.value || tracking.payload.totalMs || null,
        },
        anonymousId: "cala-api",
        timestamp: tracking.timestamp,
      }))
    );
  }
}

export function trackEvent(
  ctx: ParameterizedContext<TrackingState>,
  event: string,
  payload?: Record<string, any>
) {
  ctx.state.tracking.push({
    timestamp: new Date().toISOString(),
    event,
    payload: payload || {},
  });
}

export function trackTime<T>(
  ctx: ParameterizedContext<TrackingState>,
  event: string,
  callback: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  return callback().finally(() => {
    const endTime = performance.now();

    trackEvent(ctx, `timing/${event}`, { totalMs: endTime - startTime });
  });
}
