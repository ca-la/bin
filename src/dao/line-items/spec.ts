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
import createDesign from "../../services/create-design";
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
    collection,
    collectionDesigns: [design1, design2],
    quotes: [quote1, quote2],
    invoice,
  } = await checkout();

  const lineItems = await findByInvoiceId(invoice.id);
  const result = await getLineItemsWithMetaByInvoiceId(invoice.id);
  t.deepEqual(
    result,
    [
      {
        ...lineItems[1],
        designTitle: design2.title,
        designCollections: [{ id: collection.id, title: collection.title }],
        designImageIds: [],
        quotedUnits: quote2.units,
        quotedUnitCostCents: quote2.unitCostCents,
      },
      {
        ...lineItems[0],
        designTitle: design1.title,
        designCollections: [{ id: collection.id, title: collection.title }],
        designImageIds: [],
        quotedUnits: quote1.units,
        quotedUnitCostCents: quote1.unitCostCents,
      },
    ],
    "Attaches meta data to invoice lines"
  );
});
