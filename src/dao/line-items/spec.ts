import tape from "tape";
import Knex from "knex";
import uuid from "node-uuid";
import { test } from "../../test-helpers/fresh";
import {
  create,
  findById,
  findByInvoiceId,
  getLineItemsWithMetaByInvoiceId,
} from "./index";
import { createTrx as createInvoice } from "../invoices";
import db from "../../services/db";
import LineItem from "../../domain-objects/line-item";
import Invoice = require("../../domain-objects/invoice");
import { PricingQuote } from "../../domain-objects/pricing-quote";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import generatePricingQuote from "../../services/generate-pricing-quote";
import createUser from "../../test-helpers/create-user";
import generateInvoice from "../../test-helpers/factories/invoice";
import createDesign from "../../services/create-design";
import generateCollection from "../../test-helpers/factories/collection";
import { moveDesign } from "../../test-helpers/collections";
import generateAsset from "../../test-helpers/factories/asset";
import generateComponent from "../../test-helpers/factories/component";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import generateLineItem from "../../test-helpers/factories/line-item";
import { generateDesign } from "../../test-helpers/factories/product-design";

test("LineItems DAO supports creation/retrieval", async (t: tape.Test) => {
  const id = uuid.v4();

  const invoiceData = {
    description: "Payment for designs",
    title: "Collection",
    totalCents: 10,
  };
  let invoice: Invoice | undefined;
  await db.transaction(async (trx: Knex.Transaction) => {
    invoice = await createInvoice(trx, invoiceData);
  });

  if (!invoice) {
    return t.fail();
  }
  const { user } = await createUser({ withSession: false });
  const design = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });

  const data: LineItem = {
    createdAt: new Date(),
    description: "test",
    designId: design.id,
    id,
    invoiceId: invoice.id,
    quoteId: null,
    title: "test",
  };
  const inserted = await create(data);
  const result = await findById(inserted.id);
  t.deepEqual(result, inserted, "Returned inserted lineItem");
});

test("LineItems DAO supports retrieval by invoice id", async (t: tape.Test) => {
  const id = uuid.v4();
  const id2 = uuid.v4();

  const invoiceData = {
    description: "Payment for designs",
    title: "Collection",
    totalCents: 10,
  };
  let invoice: Invoice | undefined;
  await db.transaction(async (trx: Knex.Transaction) => {
    invoice = await createInvoice(trx, invoiceData);
  });

  if (!invoice) {
    return t.fail();
  }
  const { user } = await createUser({ withSession: false });
  const design1 = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });
  const design2 = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });

  const data: LineItem = {
    createdAt: new Date(),
    description: "test",
    designId: design1.id,
    id,
    invoiceId: invoice.id,
    quoteId: null,
    title: "test",
  };
  const data2: LineItem = {
    createdAt: new Date(),
    description: "test2",
    designId: design2.id,
    id: id2,
    invoiceId: invoice.id,
    quoteId: null,
    title: "test2",
  };
  const inserted = await create(data);
  const inserted2 = await create(data2);
  const result = await findByInvoiceId(invoice.id);
  t.deepEqual(result, [inserted, inserted2], "Returned inserted lineItem");
});

async function createQuote(
  createPricingValues: boolean = true
): Promise<PricingQuote> {
  if (createPricingValues) {
    await generatePricingValues();
  }

  const { user } = await createUser({ withSession: false });
  const design = await generateDesign({ userId: user.id });

  return generatePricingQuote(
    {
      createdAt: new Date(),
      deletedAt: null,
      expiresAt: null,
      id: uuid.v4(),
      minimumOrderQuantity: 1,
      designId: design.id,
      materialBudgetCents: 1200,
      materialCategory: "BASIC",
      processes: [
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
        {
          complexity: "1_COLOR",
          name: "SCREEN_PRINTING",
        },
      ],
      productComplexity: "SIMPLE",
      productType: "TEESHIRT",
      processTimelinesVersion: 0,
      processesVersion: 0,
      productMaterialsVersion: 0,
      productTypeVersion: 0,
      marginVersion: 0,
      constantsVersion: 0,
      careLabelsVersion: 0,
    },
    100000
  );
}

test("getLineItemsWithMetaByInvoiceId retrieves all line items with meta for an invoice", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });
  const { invoice } = await generateInvoice({ userId: user.id });
  const result1 = await getLineItemsWithMetaByInvoiceId(invoice.id);
  t.deepEqual(result1, [], "Returns nothing if there are no line items");

  // Create all the items necessary to return a line item with metadata

  const design1 = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });
  const { collection } = await generateCollection({
    createdBy: user.id,
    title: "Collection1",
  });
  await moveDesign(collection.id, design1.id);

  const { asset } = await generateAsset({ userId: user.id });
  const { component } = await generateComponent({
    createdBy: user.id,
    sketchId: asset.id,
  });
  await generateCanvas({
    componentId: component.id,
    designId: design1.id,
    createdBy: user.id,
  });

  const { invoice: invoice2 } = await generateInvoice({
    collectionId: collection.id,
    totalCents: 100000,
    userId: user.id,
  });
  const quote = await createQuote(true);
  const { lineItem } = await generateLineItem(quote.id, {
    designId: design1.id,
    invoiceId: invoice2.id,
  });

  const result2 = await getLineItemsWithMetaByInvoiceId(invoice2.id);
  t.deepEqual(
    result2,
    [
      {
        ...lineItem,
        designTitle: "Plain White Tee",
        designCollections: [{ id: collection.id, title: "Collection1" }],
        designImageIds: [asset.id],
        quotedUnits: quote.units,
        quotedUnitCostCents: quote.unitCostCents,
      },
    ],
    "Returns the line item"
  );
});
