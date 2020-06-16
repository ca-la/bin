import tape from "tape";

import { authHeader, get } from "../../test-helpers/http";
import { test } from "../../test-helpers/fresh";
import { checkout } from "../../test-helpers/checkout-collection";
import Timeline from "./domain-object";

test("GET /timelines?userId finds timelines by user id", async (t: tape.Test) => {
  const {
    user: { designer },
    collectionDesigns,
  } = await checkout();

  const [response, body] = await get(`/timelines?userId=${designer.user.id}`, {
    headers: authHeader(designer.session.id),
  });
  t.equal(response.status, 200, "?userId returns a 200");
  const t1 = body.find(
    (timeline: Timeline) => timeline.designId === collectionDesigns[0].id
  );
  const t2 = body.find(
    (timeline: Timeline) => timeline.designId === collectionDesigns[1].id
  );
  t.deepEqual(t1, {
    ...t1,
    designId: collectionDesigns[0].id,
    bufferTimeMs: 190588235,
    preProductionTimeMs: 129600000,
    productionTimeMs: 561600000,
    samplingTimeMs: 129600000,
    sourcingTimeMs: 129600000,
    specificationTimeMs: 129600000,
  });
  t.deepEqual(t2, {
    ...t2,
    designId: collectionDesigns[1].id,
    bufferTimeMs: 109016471,
    preProductionTimeMs: 77760000,
    productionTimeMs: 462240000,
    samplingTimeMs: 0,
    sourcingTimeMs: 0,
    specificationTimeMs: 77760000,
  });
});

test("GET /timelines?collectionId finds timelines by collection id", async (t: tape.Test) => {
  const {
    user: { designer },
    collection,
    collectionDesigns,
  } = await checkout();

  const [response, body] = await get(
    `/timelines?collectionId=${collection.id}`,
    {
      headers: authHeader(designer.session.id),
    }
  );
  t.equal(response.status, 200, "?userId returns a 200");
  const t1 = body.find(
    (timeline: Timeline) => timeline.designId === collectionDesigns[0].id
  );
  const t2 = body.find(
    (timeline: Timeline) => timeline.designId === collectionDesigns[1].id
  );
  t.deepEqual(t1, {
    ...t1,
    designId: collectionDesigns[0].id,
    bufferTimeMs: 190588235,
    preProductionTimeMs: 129600000,
    productionTimeMs: 561600000,
    samplingTimeMs: 129600000,
    sourcingTimeMs: 129600000,
    specificationTimeMs: 129600000,
  });
  t.deepEqual(t2, {
    ...t2,
    designId: collectionDesigns[1].id,
    bufferTimeMs: 109016471,
    preProductionTimeMs: 77760000,
    productionTimeMs: 462240000,
    samplingTimeMs: 0,
    sourcingTimeMs: 0,
    specificationTimeMs: 77760000,
  });
});
