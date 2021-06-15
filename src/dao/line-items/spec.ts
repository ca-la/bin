import tape from "tape";
import Knex from "knex";
import uuid from "node-uuid";
import { test } from "../../test-helpers/fresh";
import {
  create,
  createAll,
  findById,
  findByInvoiceId,
  getLineItemsWithMetaByInvoiceId,
} from "./index";
import { createTrx as createInvoice } from "../invoices";
import db from "../../services/db";
import LineItem from "../../domain-objects/line-item";
import createUser from "../../test-helpers/create-user";
import generateInvoice from "../../test-helpers/factories/invoice";
import createDesign from "../../services/create-design";
import generateAsset from "../../test-helpers/factories/asset";
import generateComponent from "../../test-helpers/factories/component";
import generateCanvas from "../../test-helpers/factories/product-design-canvas";
import generateLineItem from "../../test-helpers/factories/line-item";
import { checkout } from "../../test-helpers/checkout-collection";

test("LineItems DAO supports creation/retrieval", async (t: tape.Test) => {
  const { user } = await createUser({ withSession: false });

  const d1 = await createDesign({
    productType: "TEESHIRT",
    title: "Plain White Tee",
    userId: user.id,
  });

  const d2 = await createDesign({
    productType: "TEESHIRT",
    title: "Embellished White Tee",
    userId: user.id,
  });

  const invoice = await db.transaction((trx: Knex.Transaction) =>
    createInvoice(trx, {
      description: "Payment for designs",
      title: "Collection",
      totalCents: 10,
    })
  );

  if (!invoice) {
    return t.fail();
  }

  const li1: LineItem = {
    createdAt: new Date(),
    description: d1.id,
    designId: d1.id,
    id: uuid.v4(),
    invoiceId: invoice.id,
    quoteId: null,
    title: "test",
  };

  const li2: LineItem = {
    createdAt: new Date(),
    description: d2.id,
    designId: d2.id,
    id: uuid.v4(),
    invoiceId: invoice.id,
    quoteId: null,
    title: "test",
  };

  const trx1 = await db.transaction();

  try {
    const inserted = await create(li1, trx1);
    const result = await findById(inserted.id, trx1);
    t.deepEqual(result, inserted, "Returned inserted lineItem");
  } catch (err) {
    t.fail(err);
    throw err;
  } finally {
    await trx1.rollback();
  }

  const trx2 = await db.transaction();

  try {
    const multipleInserted = await createAll(trx2, [li1, li2]);

    t.deepEqual(
      multipleInserted,
      await findByInvoiceId(invoice.id, trx2),
      "returns inserted line items"
    );
  } catch (err) {
    t.fail(err);
    throw err;
  } finally {
    await trx2.rollback();
  }
});

test("LineItems DAO supports retrieval by invoice id", async (t: tape.Test) => {
  const id = uuid.v4();
  const id2 = uuid.v4();

  const invoiceData = {
    description: "Payment for designs",
    title: "Collection",
    totalCents: 10,
  };
  const invoice = await db.transaction((trx: Knex.Transaction) =>
    createInvoice(trx, invoiceData)
  );

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

test("getLineItemsWithMetaByInvoiceId retrieves all line items with meta for an invoice", async (t: tape.Test) => {
  const {
    user: {
      designer: { user },
    },
    collection,
    collectionDesigns: [design1],
    quotes: [quote],
  } = await checkout();
  const { invoice } = await generateInvoice({ userId: user.id });
  const result1 = await getLineItemsWithMetaByInvoiceId(invoice.id);
  t.deepEqual(result1, [], "Returns nothing if there are no line items");

  // Create all the items necessary to return a line item with metadata

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
        designTitle: design1.title,
        designCollections: [{ id: collection.id, title: collection.title }],
        designImageIds: [asset.id],
        quotedUnits: quote.units,
        quotedUnitCostCents: quote.unitCostCents,
      },
    ],
    "Returns the line item"
  );
});
