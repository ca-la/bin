import tape from "tape";

import { authHeader, get } from "../../test-helpers/http";
import { test } from "../../test-helpers/fresh";
import { checkout } from "../../test-helpers/checkout-collection";

test("GET /timelines?userId and /timelines?collectionId finds timelines by user id", async (t: tape.Test) => {
  const {
    user: { designer },
    collection,
    collectionDesigns,
  } = await checkout();

  const [response, body] = await get(`/timelines?userId=${designer.user.id}`, {
    headers: authHeader(designer.session.id),
  });
  t.equal(response.status, 200, "?userId returns a 200");
  t.deepEqual(
    body,
    [
      {
        ...body[0],
        designId: collectionDesigns[0].id,
        bufferTimeMs: 190588235,
        preProductionTimeMs: 129600000,
        productionTimeMs: 561600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
      },
      {
        ...body[1],
        designId: collectionDesigns[1].id,
        bufferTimeMs: 109016471,
        preProductionTimeMs: 77760000,
        productionTimeMs: 462240000,
        samplingTimeMs: 0,
        sourcingTimeMs: 0,
        specificationTimeMs: 77760000,
      },
    ],
    "?userId returns expected timeline values"
  );

  const [response2, body2] = await get(
    `/timelines?collectionId=${collection.id}`,
    {
      headers: authHeader(designer.session.id),
    }
  );
  t.equal(response2.status, 200, "?collectionId returns a 200");
  t.deepEqual(
    body2,
    [
      {
        ...body2[0],
        designId: collectionDesigns[0].id,
        bufferTimeMs: 190588235,
        preProductionTimeMs: 129600000,
        productionTimeMs: 561600000,
        samplingTimeMs: 129600000,
        sourcingTimeMs: 129600000,
        specificationTimeMs: 129600000,
      },
      {
        ...body2[1],
        designId: collectionDesigns[1].id,
        bufferTimeMs: 109016471,
        preProductionTimeMs: 77760000,
        productionTimeMs: 462240000,
        samplingTimeMs: 0,
        sourcingTimeMs: 0,
        specificationTimeMs: 77760000,
      },
    ],
    "?collectionId returns expected timeline values"
  );
});
