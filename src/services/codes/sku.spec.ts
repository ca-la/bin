import uuid from "node-uuid";

import { test, Test, db } from "../../test-helpers/fresh";
import { generateDesign } from "../../test-helpers/factories/product-design";
import { generateProductDesignVariantDb } from "../../test-helpers/factories/product-design-variant";
import generateCollection from "../../test-helpers/factories/collection";
import { generateTeam } from "../../test-helpers/factories/team";
import {
  abbreviate,
  computeSku,
  computeUniqueSku,
  getUniqueSkuNumber,
} from "./sku";
import { addDesign } from "../../test-helpers/collections";
import { VariantDb } from "../../components/product-design-variants/types";
import { Transaction } from "knex";
import createUser from "../../test-helpers/create-user";

test("computeUniqueSku: returns unique sku for the variants", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  // first team
  const { team } = await generateTeam(user.id, { title: "Y,IWO" });
  const { collection } = await generateCollection({
    title: "Golds 2.0",
    teamId: team.id,
  });
  const design1 = await generateDesign({
    userId: user.id,
    collectionIds: [collection.id],
    title: "Quad Shorts",
  });
  const variant1 = await generateProductDesignVariantDb({
    designId: design1.id,
    colorName: "Black",
    sizeName: "Small",
    position: 0,
  });
  const variant2 = await generateProductDesignVariantDb({
    designId: design1.id,
    colorName: "Black",
    sizeName: "X-Large",
    position: 1,
  });

  const variant1Sku = await computeUniqueSku(db, variant1);
  t.equals(variant1Sku, "YIW-GOL20-QUASHO-BLA-S");
  const variant2Sku = await computeUniqueSku(db, variant2);
  t.equals(variant2Sku, "YIW-GOL20-QUASHO-BLA-XL");

  // second team
  const { team: team2 } = await generateTeam(user.id, {
    title: "Dylan's Team",
  });
  const { collection: collection2 } = await generateCollection({
    title: "My Great Collection",
    teamId: team2.id,
  });
  const design2 = await generateDesign({
    userId: user.id,
    collectionIds: [collection2.id],
    title: "CALA Tee Long-Sleeve Edition",
  });
  const variant3 = await generateProductDesignVariantDb({
    designId: design2.id,
    colorName: "Black",
    sizeName: "Small",
    position: 3,
  });
  const variant4 = await generateProductDesignVariantDb({
    designId: design2.id,
    colorName: "Black",
    sizeName: "X-Large",
    position: 4,
  });
  await generateProductDesignVariantDb({
    designId: design2.id,
    colorName: "Black",
    sizeName: "X-Large",
    position: 5,
    sku: "DYLTEA-MYGRECOL-CALTEELONEDI-BLA-XL",
  });

  const variant3Sku = await computeUniqueSku(db, variant3);
  t.equals(variant3Sku, "DYLTEA-MYGRECOL-CALTEELONEDI-BLA-S");
  const variant4Sku = await computeUniqueSku(db, variant4);
  t.equals(
    variant4Sku,
    "DYLTEA-MYGRECOL-CALTEELONEDI-BLA-XL-2",
    "sku with unique number as the default sku is taken by another variant"
  );
});

test("computeUniqueSku: returns unique sku for the variants with some changed but unsaved variants (bulk update case)", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  // first team
  const { team } = await generateTeam(user.id, { title: "Y,IWO" });
  const { collection } = await generateCollection({
    title: "Golds 2.0",
    teamId: team.id,
  });
  const design1 = await generateDesign({
    userId: user.id,
    collectionIds: [collection.id],
    title: "Quad Shorts",
  });
  const variant1 = await generateProductDesignVariantDb({
    designId: design1.id,
    colorName: "Black",
    sizeName: "Small",
    position: 0,
  });
  const variant2 = await generateProductDesignVariantDb({
    designId: design1.id,
    colorName: "Black",
    sizeName: "X-Large",
    position: 1,
  });

  t.equals(
    await computeUniqueSku(db, variant1, [
      {
        ...variant2,
        sizeName: "Small",
        sku: null,
      },
    ]),
    "YIW-GOL20-QUASHO-BLA-S",
    "SKU without unique index"
  );

  t.equals(
    await computeUniqueSku(db, variant1, [
      {
        ...variant2,
        sizeName: "Small",
        sku: "YIW-GOL20-QUASHO-BLA-S",
      },
    ]),
    "YIW-GOL20-QUASHO-BLA-S-2",
    "when possible sku is taken by unsaved variant and we add the unique index"
  );

  t.equals(
    await computeUniqueSku(db, variant1, [
      {
        ...variant2,
        sizeName: "Small",
        sku: "YIW-GOL20-QUASHO-BLA-S",
      },
      {
        ...variant2,
        id: uuid.v4(),
        sizeName: "Small",
        sku: "YIW-GOL20-QUASHO-BLA-S-2",
      },
    ]),
    "YIW-GOL20-QUASHO-BLA-S-3",
    "when possible sku is taken by unsaved variant and we add the unique index"
  );

  await generateProductDesignVariantDb({
    designId: design1.id,
    colorName: "Black",
    sizeName: "X-Large",
    position: 3,
    sku: "YIW-GOL20-QUASHO-BLA-S-3",
  });

  t.equals(
    await computeUniqueSku(db, variant1, [
      {
        ...variant2,
        sizeName: "Small",
        sku: "YIW-GOL20-QUASHO-BLA-S",
      },
      {
        ...variant2,
        id: uuid.v4(),
        sizeName: "Small",
        sku: "YIW-GOL20-QUASHO-BLA-S-2",
      },
    ]),
    "YIW-GOL20-QUASHO-BLA-S-4",
    "when possible sku is taken by saved and unsaved variants and we add the unique index"
  );
});

test("getUniqueSkuNumber returns first minimum unique index unused by similar skus, started from 2", async (t: Test) => {
  t.equal(
    getUniqueSkuNumber("", []),
    2,
    "returns 2 for empty string and empty slimilar skus array"
  );
  t.equal(
    getUniqueSkuNumber("YIWO-SKU", []),
    2,
    "returns 2 for string and empty similar skus array"
  );
  t.equal(
    getUniqueSkuNumber("YIWO-SKU", ["CALA-SKU", "CALA-SKU-1", "CALA-SKU-2"]),
    2,
    "returns 2 for string and skus those don't match sku"
  );

  t.equal(
    getUniqueSkuNumber("YIWO-SKU", ["YIWO-SKU", "YIWO-SKU-", "YIWO-SKU-A"]),
    2,
    "returns 2 if similar sku doesn't end with the number"
  );

  t.equal(
    getUniqueSkuNumber("YIWO-SKU", ["YIWO-SKU", "YIWO-SKU-", "YIWO-SKU-1"]),
    2
  );

  t.equal(
    getUniqueSkuNumber("YIWO-SKU", [
      "YIWO-SKU",
      "YIWO-SKU-",
      "YIWO-SKU-2",
      "YIWO-SKU-4",
    ]),
    5,
    "Returns max index + 1 from similar skus"
  );

  t.equal(
    getUniqueSkuNumber("YIWO-SKU", [
      "YIWO-SKU-1",
      "YIWO-SKU-4",
      "YIWO-SKU",
      "YIWO-SKU-3",
      "YIWO-SKU-",
    ]),
    5,
    "Returns max + 1 index which is not taken by similar skus (unordered skus array)"
  );

  t.equal(
    getUniqueSkuNumber("YIWO-SKU", [
      "YIWO-SKU-5",
      "YIWO-SKU",
      "YIWO-SKU-3",
      "YIWO-SKU-",
      "YIWO-SKU-13",
    ]),
    14,
    "Returns max + 1 index which is not taken by similar skus (unordered skus array)"
  );

  t.equal(
    getUniqueSkuNumber("YIWO-SKU", [
      "YIWO-SKU",
      "YIWO-SKU-",
      "YIWO-SKU-2",
      "YIWO-SKU-4",
    ]),
    5
  );

  t.equal(
    getUniqueSkuNumber("YIWO-SKU", [
      "YIWO-SKU",
      "YIWO-SKU-",
      "YIWO-SKU-1",
      "YIWO-SKU-1",
      "YIWO-SKU-1",
      "YIWO-SKU-2",
      "YIWO-SKU-2",
      "YIWO-SKU-2",
      "YIWO-SKU-4",
    ]),
    5
  );
});

test("abbreviate", async (t: Test) => {
  const testCases = [
    {
      title: "Short name",
      in: "  abc ",
      out: "ABC",
    },
    {
      title: "Non-alphanumeric",
      in: " a_ b_ c _x_ y_ z 0 1  2   3 4 5 6 7 8 9  ",
      out: "ABCXYZ0123456789",
    },
    {
      title: "One word",
      in: " __something__ ",
      out: "SOM",
    },
    {
      title: "Small size without abbreviating",
      in: "Small",
      out: "SMA",
    },
    {
      title: "Small size with abbreviating",
      in: "Small",
      out: "S",
      options: { abbreviateSingleWord: true },
    },
    {
      title: "X-Large size",
      in: "X-Large",
      out: "XLA",
    },
    {
      title: "Size",
      in: "X-Large",
      out: "XL",
      options: { abbreviateSingleWord: true },
    },
    {
      title: "Real example",
      in: '"Get to work" bandana',
      out: "GETTOWORBAN",
    },
    {
      title: "Title with dash",
      in: "CALA Tee Long-Sleeve Edition",
      out: "CALTEELONEDI",
    },
  ];

  for (const testCase of testCases) {
    t.equal(
      abbreviate(testCase.in, testCase.options),
      testCase.out,
      testCase.title
    );
  }
});

test("computeSku", async (t: Test) => {
  const { user } = await createUser({ withSession: false });

  const { team } = await generateTeam(user.id, {
    title: "YIWO",
  });
  const { collection } = await generateCollection({
    title: "Yeah I Work Out",
    teamId: team.id,
  });
  const d1 = await generateDesign({
    title: "CALA Tee Long-Sleeve Edition",
    userId: user.id,
  });
  const d2 = await generateDesign({
    title: "Get To Work Sweatshirt",
    userId: user.id,
  });
  await addDesign(collection.id, d1.id);

  const variantBase = await generateProductDesignVariantDb({
    designId: d1.id,
    colorName: null,
    sizeName: null,
    unitsToProduce: 1,
    position: 1,
    colorNamePosition: 1,
  });
  interface TestCase {
    title: string;
    variant: Partial<VariantDb>;
    sku: string;
  }
  const testCases: TestCase[] = [
    {
      title: "Only design title",
      variant: {
        designId: d2.id,
      },
      sku: "GETTOWORSWE",
    },
    {
      title: "Collection + design title",
      variant: {},
      sku: "YIW-YEAIWOROUT-CALTEELONEDI",
    },
    {
      title: "Collection + design title + size",
      variant: {
        sizeName: "XL",
      },
      sku: "YIW-YEAIWOROUT-CALTEELONEDI-XL",
    },
    {
      title: "Collection + design title + color",
      variant: {
        colorName: "Red, Blue",
      },
      sku: "YIW-YEAIWOROUT-CALTEELONEDI-REDBLU",
    },
    {
      title: "Collection + design title + color same as design name",
      variant: {
        colorName: d1.title,
      },
      sku: "YIW-YEAIWOROUT-CALTEELONEDI-CALTEELONEDI",
    },
    {
      title: "Collection + design title + S size + color",
      variant: {
        sizeName: "S",
        colorName: "Red, Blue",
      },
      sku: "YIW-YEAIWOROUT-CALTEELONEDI-REDBLU-S",
    },
    {
      title: "Collection + design title + X-Small size + color",
      variant: {
        sizeName: "X-Small",
        colorName: "Red, Blue",
      },
      sku: "YIW-YEAIWOROUT-CALTEELONEDI-REDBLU-XS",
    },
    {
      title: "Collection + design title + Large size + color",
      variant: {
        sizeName: "Large",
        colorName: "Red, Blue",
      },
      sku: "YIW-YEAIWOROUT-CALTEELONEDI-REDBLU-L",
    },
  ];

  await db.transaction(async (trx: Transaction) => {
    for (const testCase of testCases) {
      const computedSku = await computeSku(trx, {
        ...variantBase,
        ...testCase.variant,
      });
      const expectedSku = `${testCase.sku}`;
      t.equal(computedSku, expectedSku, testCase.title);
    }
  });
});
