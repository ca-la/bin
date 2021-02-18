import uuid from "node-uuid";
import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as Analytics from "../../services/analytics";

import { track, trackEvent, trackTime } from "./index";

test("Tracking middleware flushes tracking to analytics", async (t: Test) => {
  const testDate = new Date(2012, 11, 24);
  const clock = sandbox().useFakeTimers(testDate);
  sandbox().stub(uuid, "v4").returns("a-uuid");
  const ctx = ({
    originalUrl: "/designs/d856c262-c7a0-4e1e-98f1-84dad67c9702",
    request: {
      method: "PUT",
    },
    state: {},
  } as unknown) as PublicContext;

  const nextStub = sandbox().stub();
  const batchStub = sandbox().stub(Analytics, "batch").resolves();

  const result = track.call(ctx, nextStub);
  result.next();
  clock.tick(1000);
  result.next();

  t.deepEqual(
    batchStub.firstCall.args,
    [
      [
        {
          anonymousId: "cala-api",
          eventName: "[ROUTE] timing/PUT /designs/:id",
          payload: {
            tracking: `{"totalMs":1000}`,
            trackingId: "a-uuid",
            value: 1000,
          },
          timestamp: clock.Date().toISOString(),
        },
      ],
    ],
    "calls Analytics.batch with correct value"
  );
});

test("trackEvent", async (t: Test) => {
  const testDate = new Date(2012, 11, 24);
  sandbox().useFakeTimers(testDate);
  const ctx = ({
    state: {
      trackingId: "a-tracking-id",
      tracking: [],
    },
  } as unknown) as PublicContext;

  trackEvent(ctx, "Event Name", { foo: "bar" });

  t.deepEqual(
    ctx.state.tracking,
    [
      {
        timestamp: testDate.toISOString(),
        event: "Event Name",
        payload: { foo: "bar" },
      },
    ],
    "adds tracking event to context state tracking array"
  );
});

test("trackTime", async (t: Test) => {
  const testDate = new Date(2012, 11, 24);
  const clock = sandbox().useFakeTimers(testDate);
  const ctx = ({
    state: {
      trackingId: "a-tracking-id",
      tracking: [],
    },
  } as unknown) as PublicContext;

  const result = await trackTime(ctx, "Event Name", async () => {
    clock.tick(1000);
    return "foo";
  });

  t.deepEqual(
    ctx.state.tracking,
    [
      {
        timestamp: clock.Date().toISOString(),
        event: "timing/Event Name",
        payload: { totalMs: 1000 },
      },
    ],
    "times the async function and adds timing tracking"
  );

  t.equal(result, "foo", "returns the callback's return value");
});
