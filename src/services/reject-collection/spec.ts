import uuid from "node-uuid";
import Knex from "knex";

import { submitCollection } from "../../test-helpers/submit-collection";
import { db, test, Test } from "../../test-helpers/fresh";

import * as PricingCostInputsDAO from "../../components/pricing-cost-inputs/dao";
import { PricingCostInput } from "../../components/pricing-cost-inputs/types";
import { removeAllDesigns } from "../../components/collections/dao/design";
import { removeDesign } from "../../test-helpers/collections";
import { costCollection } from "../../test-helpers/cost-collection";

import { rejectCollection } from "./index";

test("rejectCollection: empty collection", async (t: Test) => {
  t.deepEqual(
    await rejectCollection(uuid.v4(), uuid.v4()),
    [],
    "returns empty list of events"
  );
});

test("rejectCollection: emptied collection", async (t: Test) => {
  const {
    collection,
    user: { admin },
  } = await submitCollection();

  await db.transaction((trx: Knex.Transaction) =>
    removeAllDesigns(trx, collection.id)
  );

  t.deepEqual(
    await rejectCollection(collection.id, admin.user.id),
    [],
    "returns reject events for each design"
  );
});

test("rejectCollection: collection removed design", async (t: Test) => {
  const {
    collection,
    collectionDesigns,
    user: { admin },
  } = await submitCollection();

  removeDesign(collection.id, collectionDesigns[0].id);
  const rejectEvents = await rejectCollection(collection.id, admin.user.id);

  t.deepEqual(
    rejectEvents,
    [
      {
        ...rejectEvents[0],
        type: "REJECT_DESIGN",
        designId: collectionDesigns[1].id,
      },
    ],
    "returns reject events for remaining design"
  );
});

test("rejectCollection: collection with designs", async (t: Test) => {
  const {
    collection,
    collectionDesigns,
    user: { admin },
  } = await submitCollection();

  const rejectEvents = await rejectCollection(collection.id, admin.user.id);

  t.deepEqual(
    rejectEvents,
    [
      {
        ...rejectEvents[0],
        type: "REJECT_DESIGN",
        designId: collectionDesigns[0].id,
      },
      {
        ...rejectEvents[1],
        type: "REJECT_DESIGN",
        designId: collectionDesigns[1].id,
      },
    ],
    "returns reject events for each design"
  );
});

test("rejectCollection: collection with designs that have been costed", async (t: Test) => {
  const {
    collection,
    collectionDesigns,
    user: { admin },
  } = await costCollection();

  const rejectEvents = await rejectCollection(collection.id, admin.user.id);

  t.deepEqual(
    rejectEvents,
    [
      {
        ...rejectEvents[0],
        type: "REJECT_DESIGN",
        designId: collectionDesigns[0].id,
      },
      {
        ...rejectEvents[1],
        type: "REJECT_DESIGN",
        designId: collectionDesigns[1].id,
      },
    ],
    "returns reject events for each design"
  );

  const latestCostInputs = await PricingCostInputsDAO.findLatestForEachDesignId(
    db,
    [collectionDesigns[0].id, collectionDesigns[1].id]
  );

  t.true(
    Object.values(latestCostInputs).every((costInput: PricingCostInput) =>
      costInput.expiresAt ? costInput.expiresAt <= new Date() : false
    ),
    "expires cost inputs"
  );
});
