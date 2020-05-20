import Knex from "knex";
import uuid from "node-uuid";

import { test, Test } from "../../../test-helpers/fresh";
import createDesign from "../../../services/create-design";
import createUser = require("../../../test-helpers/create-user");
import db from "../../../services/db";
import {
  create,
  createList,
  findByDesignId,
  getAll,
  remove,
  removeList,
} from "./dao";

test("createList() + removeList()", async (t: Test) => {
  const { user } = await createUser({ role: "ADMIN", withSession: false });
  const design1 = await createDesign({
    productType: "SHIRT",
    title: "Test Shirt",
    userId: user.id,
  });
  const design2 = await createDesign({
    productType: "PANT",
    title: "Test Pant",
    userId: user.id,
  });

  // Can mark designs as a template.
  await db.transaction(async (trx: Knex.Transaction) => {
    const result = await createList(
      [{ designId: design1.id }, { designId: design2.id }],
      trx
    );
    t.deepEqual(result, [{ designId: design1.id }, { designId: design2.id }]);
  });

  // Can remove designs marked as a template.
  await db.transaction(async (trx: Knex.Transaction) => {
    const result = await removeList([design1.id, design2.id], trx);
    t.equal(result, 2);
  });
});

test("create()", async (t: Test) => {
  const { user } = await createUser({ role: "ADMIN", withSession: false });
  const design = await createDesign({
    productType: "SHIRT",
    title: "Test Shirt",
    userId: user.id,
  });

  // Cannot mark an unknown design as a template
  await db.transaction(async (trx: Knex.Transaction) => {
    const fakeDesign = uuid.v4();
    try {
      await create({ designId: fakeDesign }, trx);
      t.fail("Should not successfully create a template.");
    } catch (error) {
      t.equal(error.message, `Design ${fakeDesign} does not exist.`);
    }
  });

  // Can mark a design as a template.
  await db.transaction(async (trx: Knex.Transaction) => {
    const result = await create({ designId: design.id }, trx);
    t.deepEqual(result, { designId: design.id });
  });

  // Cannot mark a design as a template multiple times.
  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await create({ designId: design.id }, trx);
      t.fail("Should not successfully create a template.");
    } catch (error) {
      t.equal(error.message, `Design ${design.id} is already a template.`);
    }
  });
});

test("findByDesignId()", async (t: Test) => {
  const { user } = await createUser({ role: "ADMIN", withSession: false });
  const design = await createDesign({
    productType: "SHIRT",
    title: "Test Shirt",
    userId: user.id,
  });

  const result1 = await findByDesignId(design.id);
  t.equal(result1, null, "Returns nothing");

  // Can find a design that was marked as a template.
  await db.transaction(async (trx: Knex.Transaction) => {
    await create({ designId: design.id }, trx);

    const result2 = await findByDesignId(design.id, trx);
    t.deepEqual(result2, { designId: design.id }, "Returns the inserted row");
  });
});

test("remove()", async (t: Test) => {
  const { user } = await createUser({ role: "ADMIN", withSession: false });
  const design = await createDesign({
    productType: "SHIRT",
    title: "Test Shirt",
    userId: user.id,
  });

  // create a template
  await db.transaction(async (trx: Knex.Transaction) => {
    await create({ designId: design.id }, trx);
    const results = await getAll(trx, { limit: 10, offset: 0 });
    t.deepEqual(results, [design], "There is only one element in the list.");
  });

  // deleting something that isn't there
  const nonexistent = uuid.v4();
  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await remove(nonexistent, trx);
      t.fail("Should not reach here.");
    } catch (error) {
      t.equal(error.message, `Template for design ${nonexistent} not found.`);
    }
  });

  // can remove a template.
  await db.transaction(async (trx: Knex.Transaction) => {
    await remove(design.id, trx);
    const results = await getAll(trx, { limit: 10, offset: 0 });
    t.deepEqual(results, [], "There are no templates in the list.");
  });
});

test("getAll()", async (t: Test) => {
  const { user } = await createUser({ role: "ADMIN", withSession: false });
  const design1 = await createDesign({
    productType: "SHIRT",
    title: "Test Shirt",
    userId: user.id,
  });
  const design2 = await createDesign({
    productType: "SHIRT",
    title: "Test Shirt",
    userId: user.id,
  });
  const design3 = await createDesign({
    productType: "SHIRT",
    title: "Test Shirt",
    userId: user.id,
  });
  await createDesign({
    productType: "???",
    title: "Random",
    userId: user.id,
  });

  await db.transaction(async (trx: Knex.Transaction) => {
    await create({ designId: design1.id }, trx);
    await create({ designId: design2.id }, trx);
    await create({ designId: design3.id }, trx);

    const results = await getAll(trx, { limit: 10, offset: 0 });
    t.deepEqual(
      results,
      [design3, design2, design1],
      "Returns the list in order of when each design was made"
    );

    const results2 = await getAll(trx, { limit: 10, offset: 2 });
    t.deepEqual(
      results2,
      [design1],
      "Returns the list using the given offset and limit"
    );

    const results3 = await getAll(trx, { limit: 1, offset: 1 });
    t.deepEqual(
      results3,
      [design2],
      "Returns a single element list using the given offset and limit"
    );
  });
});
