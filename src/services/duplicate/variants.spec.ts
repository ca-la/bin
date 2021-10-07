import Knex from "knex";
import tape from "tape";
import uuid from "node-uuid";
import { VariantDb } from "../../components/product-design-variants/types";

import createUser from "../../test-helpers/create-user";
import db from "../../services/db";
import createDesign from "../create-design";
import { test } from "../../test-helpers/fresh";

import * as VariantsDAO from "../../components/product-design-variants/dao";

import { findAndDuplicateVariants } from "./variants";

test("findAndDuplicateVariants for a design with no variants", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    title: "Plain White Tee",
    userId: user.id,
  });

  const duplicatedVariants = await db.transaction(
    async (trx: Knex.Transaction) => {
      return findAndDuplicateVariants(design.id, design.id, trx);
    }
  );

  t.equal(duplicatedVariants.length, 0, "no variants were duplicated.");
});

test("findAndDuplicateVariants for a design with variants", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const design = await createDesign({
    title: "Plain White Tee",
    userId: user.id,
  });
  const newDesign = await createDesign({
    title: "Black Striped Oversize Tee",
    userId: user.id,
  });
  const variantOne = await VariantsDAO.create({
    colorName: "Green",
    colorNamePosition: 1,
    designId: design.id,
    id: uuid.v4(),
    position: 0,
    sizeName: "M",
    unitsToProduce: 123,
    universalProductCode: "000000000000",
    sku: null,
    isSample: false,
  });
  const variantTwo = await VariantsDAO.create({
    colorName: "Red",
    colorNamePosition: 2,
    designId: design.id,
    id: uuid.v4(),
    position: 1,
    sizeName: "L",
    unitsToProduce: 456,
    universalProductCode: null,
    sku: "red-variant-sku",
    isSample: false,
  });

  const duplicatedVariants = await db.transaction(
    async (trx: Knex.Transaction) => {
      return findAndDuplicateVariants(design.id, newDesign.id, trx);
    }
  );

  const sortedDupes = duplicatedVariants.sort(
    (a: VariantDb, b: VariantDb): number => {
      return a.createdAt.getTime() - b.createdAt.getTime();
    }
  );

  t.equal(sortedDupes.length, 2, "Should return two duplicate variants");
  const dupeOne = sortedDupes[0];
  t.deepEqual(
    { ...dupeOne, sku: null },
    {
      ...variantOne,
      sku: null,
      universalProductCode: null,
      createdAt: dupeOne.createdAt,
      designId: newDesign.id,
      id: dupeOne.id,
    },
    "Returns a duplicate of the first variant pointing to the new design"
  );
  t.equal(dupeOne.sku, null, "First variant duplicate has null SKU");
  const dupeTwo = sortedDupes[1];
  t.deepEqual(
    { ...dupeTwo, sku: null },
    {
      ...variantTwo,
      sku: null,
      createdAt: dupeTwo.createdAt,
      designId: newDesign.id,
      id: dupeTwo.id,
    },
    "Returns a duplicate of the second variant pointing to the new design"
  );
  t.equal(
    dupeTwo.sku,
    null,
    "Second variant duplicate has null SKU even though the variant has an sku"
  );
});
