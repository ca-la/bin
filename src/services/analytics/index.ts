import { fetch } from "../fetch";
import { SEGMENT_WRITE_KEY } from "../../config";

const API_BASE = "https://api.segment.io/v1";

type Method = "POST" | "PUT" | "GET" | "PATCH" | "DELETE";

const SEGMENT_CREDENTIALS = Buffer.from(`${SEGMENT_WRITE_KEY}:`).toString(
  "base64"
);

async function makeRequest(
  method: Method,
  path: string,
  payload?: object
): Promise<void | object> {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${SEGMENT_CREDENTIALS}`,
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const json = await response.json();
  return json;
}

interface TrackOptions {
  eventName: string;
  payload: object;
  anonymousId?: string;
  userId?: string;
}

interface TrackUser extends TrackOptions {
  userId: string;
  anonymousId?: undefined;
}

interface TrackAnonymous extends TrackOptions {
  anonymousId: string;
  userId?: undefined;
}

export async function trackEvent({
  eventName,
  payload,
  userId,
  anonymousId,
}: TrackUser | TrackAnonymous): Promise<void> {
  await makeRequest("POST", "/track", {
    event: eventName,
    properties: payload,
    userId,
    anonymousId,
  });
}

export async function trackMetric(
  metricName: string,
  metricValue: number
): Promise<void> {
  return trackEvent({
    eventName: `[Metric] ${metricName}`,
    payload: {
      value: metricValue,
    },
    // We don't pass through a user ID, since application/performance metrics
    // are only useful in aggregate, and are a separate category of events than
    // e.g. user-funnel things.
    anonymousId: "cala-api",
  });
}
