import { sandbox, test, Test } from "../../test-helpers/fresh";
import * as Fetch from "../fetch";
import { batch, trackEvent, trackMetric } from ".";

test("trackEvent tracks events", async (t: Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, "fetch")
    .resolves({ json: (): Promise<void> => Promise.resolve() });

  await trackEvent({
    eventName: "foo",
    payload: { bar: "buz", yes: true },
    anonymousId: "fooz-user",
  });

  t.deepEqual(fetchStub.firstCall.args[0], "https://api.segment.io/v1/track");
  const body = JSON.parse(fetchStub.firstCall.args[1].body);

  t.equal(body.event, "foo");
  t.deepEqual(body.properties, { bar: "buz", yes: true });
  t.deepEqual(body.anonymousId, "fooz-user");
});

test("trackEvent tracks identified users", async (t: Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, "fetch")
    .resolves({ json: (): Promise<void> => Promise.resolve() });

  await trackEvent({
    eventName: "foo",
    payload: {},
    userId: "fooz-user",
  });

  t.deepEqual(fetchStub.firstCall.args[0], "https://api.segment.io/v1/track");
  const body = JSON.parse(fetchStub.firstCall.args[1].body);

  t.deepEqual(body.userId, "fooz-user");
});

test("trackMetric tracks metrics", async (t: Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, "fetch")
    .resolves({ json: (): Promise<void> => Promise.resolve() });

  const track = (trackMetric as any).wrappedMethod;

  await track("Time to boot", 123);

  t.deepEqual(fetchStub.firstCall.args[0], "https://api.segment.io/v1/track");
  const body = JSON.parse(fetchStub.firstCall.args[1].body);

  t.equal(body.event, "[Metric] Time to boot");
  t.deepEqual(body.properties, { value: 123 });
  t.deepEqual(body.anonymousId, "cala-api");
});

test("batch sends multiple events in a single request", async (t: Test) => {
  const fetchStub = sandbox()
    .stub(Fetch, "fetch")
    .resolves({ json: (): Promise<void> => Promise.resolve() });
  const clock = sandbox().useFakeTimers();

  await batch([
    {
      eventName: "foo",
      payload: { bar: "buz", yes: true },
      anonymousId: "fooz-anonymous",
      timestamp: clock.Date().toISOString(),
    },
    {
      eventName: "bar",
      payload: {},
      userId: "fooz-user",
      timestamp: clock.Date().toISOString(),
    },
  ]);

  t.equal(
    fetchStub.firstCall.args[0],
    "https://api.segment.io/v1/batch",
    "calls correct /batch endpoint"
  );
  const body = JSON.parse(fetchStub.firstCall.args[1].body);

  t.deepEqual(
    body,
    {
      batch: [
        {
          type: "track",
          event: "foo",
          properties: { bar: "buz", yes: true },
          anonymousId: "fooz-anonymous",
          timestamp: clock.Date().toISOString(),
        },
        {
          type: "track",
          event: "bar",
          properties: {},
          userId: "fooz-user",
          timestamp: clock.Date().toISOString(),
        },
      ],
    },
    "maps each event to the proper schema"
  );
});
