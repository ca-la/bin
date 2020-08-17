import Knex from "knex";
import uuid from "node-uuid";

import { test, Test } from "../../../test-helpers/fresh";
import createDesign from "../../../services/create-design";
import createUser from "../../../test-helpers/create-user";
import db from "../../../services/db";
import TemplateCategoriesDAO from "../categories/dao";
import { createList, findByDesignId, getAll, remove, removeList } from "./dao";

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
      [
        { designId: design1.id, templateCategoryId: null },
        { designId: design2.id, templateCategoryId: null },
      ],
      trx
    );
    t.deepEqual(result, [
      { designId: design1.id, templateCategoryId: null },
      { designId: design2.id, templateCategoryId: null },
    ]);
  });

  // Can remove designs marked as a template.
  await db.transaction(async (trx: Knex.Transaction) => {
    const result = await removeList([design1.id, design2.id], trx);
    t.equal(result, 2);
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
    await createList([{ designId: design.id, templateCategoryId: null }], trx);

    const result2 = await findByDesignId(design.id, trx);
    t.deepEqual(
      result2,
      { designId: design.id, templateCategoryId: null },
      "Returns the inserted row"
    );
  });
});

test("remove()", async (t: Test) => {
  const { user } = await createUser({ role: "ADMIN", withSession: false });
  const design = await createDesign({
    productType: "SHIRT",
    title: "Test Shirt",
    userId: user.id,
  });

  // deleting something that isn't there
  await db.transaction(async (trx: Knex.Transaction) => {
    await createList([{ designId: design.id, templateCategoryId: null }], trx);
    const nonexistent = uuid.v4();
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
    const results = await getAll(trx, {
      limit: 10,
      offset: 0,
      templateCategoryIds: [],
    });
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
    const category = await TemplateCategoriesDAO.create(trx, {
      id: uuid.v4(),
      title: "A category",
      ordering: 0,
    });
    await createList(
      [
        { designId: design1.id, templateCategoryId: category.id },
        { designId: design2.id, templateCategoryId: null },
        { designId: design3.id, templateCategoryId: category.id },
      ],
      trx
    );

    const results = await getAll(trx, {
      limit: 10,
      offset: 0,
      templateCategoryIds: [],
    });
    t.deepEqual(
      results,
      [design2],
      "Returns the list in order of when each design was made"
    );

    const byCategory = await getAll(trx, {
      limit: 20,
      offset: 0,
      templateCategoryIds: [category.id],
    });
    t.deepEqual(
      byCategory,
      [design3, design1],
      "Returns templates in a certain category"
    );
  });
});
