import tape from "tape";
import uuid from "node-uuid";
import { test } from "../../test-helpers/fresh";
import { create, createAll, findById } from ".";

test("Tasks DAO supports creation/retrieval", async (t: tape.Test) => {
  const inserted = await create();

  const result = await findById(inserted.id);
  t.deepEqual(result, inserted, "Returned inserted task");
});

test("Tasks DAO supports create all", async (t: tape.Test) => {
  const id1 = uuid.v4();
  const id2 = uuid.v4();
  const inserted = await createAll([id1, id2]);

  const result = await findById(inserted[0].id);
  const result2 = await findById(inserted[1].id);
  t.deepEqual(result, inserted[0], "Returned inserted task");
  t.deepEqual(result2, inserted[1], "Returned inserted task");
});
