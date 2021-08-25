import uuid from "node-uuid";
import Knex from "knex";

import { submitCollection } from "../../test-helpers/submit-collection";
import { db, test, Test } from "../../test-helpers/fresh";

import { removeAllDesigns } from "../../components/collections/dao/design";
import { rejectCollection } from "./index";
import { removeDesign } from "../../test-helpers/collections";

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
