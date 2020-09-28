import { test, Test } from "../../test-helpers/fresh";
import { generateDesign } from "../../test-helpers/factories/product-design";
import generateCollection from "../../test-helpers/factories/collection";
import {
  abbreviate,
  computeUniqueSku,
  formatSequenceValue,
  SEQUENCE_NAME,
} from "./sku";
import { addDesign } from "../../test-helpers/collections";
import { VariantDb } from "../../components/product-design-variants/types";
import db from "../db";
import { Transaction } from "knex";
import { getCurrentValue } from "../sequence-increment";
import uuid from "node-uuid";
import createUser from "../../test-helpers/create-user";

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
      out: "XL",
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
      out: "GTWB",
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

test("computeUniqueSku", async (t: Test) => {
  const { collection } = await generateCollection({
    title: "Yeah I Work Out",
  });
  const { user } = await createUser({ withSession: false });
  const d1 = await generateDesign({
    title: "Get To Work Bandana",
    userId: user.id,
  });
  const d2 = await generateDesign({
    title: "Get To Work Sweatshirt",
    userId: user.id,
  });
  await addDesign(collection.id, d1.id);

  const variantBase: VariantDb = {
    id: uuid.v4(),
    createdAt: new Date(),
    designId: d1.id,
    colorName: null,
    sizeName: null,
    unitsToProduce: 1,
    position: 1,
    colorNamePosition: 1,
    universalProductCode: null,
    sku: null,
    isSample: false,
  };
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
      sku: "GTWS",
    },
    {
      title: "Collection + design title",
      variant: {},
      sku: "YIWO-GTWB",
    },
    {
      title: "Collection + design title + size",
      variant: {
        sizeName: "XL",
      },
      sku: "YIWO-GTWB-XL",
    },
    {
      title: "Collection + design title + color",
      variant: {
        colorName: "Red, Blue",
      },
      sku: "YIWO-GTWB-RB",
    },
    {
      title: "Collection + design title + color same as design name",
      variant: {
        colorName: d1.title,
      },
      sku: "YIWO-GTWB",
    },
    {
      title: "Collection + design title + size + color",
      variant: {
        sizeName: "S",
        colorName: "Red, Blue",
      },
      sku: "YIWO-GTWB-S-RB",
    },
  ];

  await db.transaction(async (trx: Transaction) => {
    for (const testCase of testCases) {
      const computedSku = await computeUniqueSku(trx, {
        ...variantBase,
        ...testCase.variant,
      });
      const numericPart = formatSequenceValue(
        await getCurrentValue(SEQUENCE_NAME)
      );
      const expectedSku = `${testCase.sku}-${numericPart}`;
      t.equal(computedSku, expectedSku, testCase.title);
    }
  });
});
