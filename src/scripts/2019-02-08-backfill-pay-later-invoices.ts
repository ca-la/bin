import * as Knex from 'knex';
import * as process from 'process';
import * as rethrow from 'pg-rethrow';

import * as db from '../services/db';
import { log } from '../services/logger';
import { green, red, reset } from '../services/colors';
import { CreateQuotePayload } from '../services/generate-pricing-quote';
import DataAdapter from '../services/data-adapter';
import { validateEvery } from '../services/validate-from-db';
import { hasProperties } from '../services/require-properties';
import Collection from '../domain-objects/collection';
import * as CollectionsDAO from '../dao/collections';
import * as ProductDesignsDAO from '../dao/product-designs';
import ProductDesign = require('../domain-objects/product-design');
import { createInvoiceWithoutMethod } from '../services/payment';

interface CollectionMeta {
  id: string;
  title: string;
  user_id: string;
}

interface CreateQuotePayloadRow {
  design_id: string;
  units: number;
}

const dataAdapter = new DataAdapter<CreateQuotePayloadRow, CreateQuotePayload>();

export function isCreateQuotePayloadRow(row: object):
  row is CreateQuotePayloadRow {
  return hasProperties(
    row,
    'design_id',
    'units'
  );
}

async function getQuoteRequests(
  collectionId: string,
  trx: Knex.Transaction
): Promise<CreateQuotePayload[]> {
  const quoteRows: CreateQuotePayloadRow[] = await db('design_events')
    .select('design_events.design_id as design_id')
    .select('q.units as units')
    .from('design_events')
    .joinRaw(`
JOIN pricing_quotes AS q ON q.id = design_events.quote_id
JOIN collection_designs AS cd ON cd.design_id = design_events.design_id
JOIN collections AS c ON c.id = cd.collection_id
    `)
    .where({ 'c.id': collectionId, 'design_events.type': 'COMMIT_QUOTE' })
    .transacting(trx);

  if (quoteRows.length < 1) {
    throw new Error('Could not find quotes for ' + collectionId);
  }

  return validateEvery<CreateQuotePayloadRow, CreateQuotePayload>(
    'design_events',
    isCreateQuotePayloadRow,
    dataAdapter,
    quoteRows
  );
}

interface PayloadObject {
  collection: Collection;
  quotes: CreateQuotePayload[];
  userId: string;
}

function areQuotesAndDesignsMatched(
  quotes: CreateQuotePayload[],
  designs: ProductDesign[]
): boolean {
  return quotes.length === designs.length &&
    quotes.reduce((acc: boolean, quote: CreateQuotePayload) => {
      return acc && Boolean(designs.find((design: ProductDesign) => design.id === quote.designId));
    }, true);
}

async function createInvoicesForPayLaterSubmits(): Promise<number> {
  const collectionsResult = await db.raw(`
SELECT c.id as id, c.title as title, c.created_by as user_id
  FROM collections AS c
  JOIN collection_designs AS cd
    ON cd.collection_id = c.id
  JOIN (
  SELECT distinct e.design_id AS id, d.title AS title
    FROM design_events AS e
    JOIN product_designs AS d
      ON e.design_id = d.id
   WHERE e.type = 'COMMIT_QUOTE'
     AND d.deleted_at IS NULL
  EXCEPT
  SELECT distinct cd.design_id AS id, d.title AS title
    FROM invoice_with_payments AS i
    JOIN collection_designs AS cd
      ON cd.collection_id = i.collection_id
    JOIN product_designs AS d
      ON cd.design_id = d.id
   WHERE (
    SELECT count(i2.id) FROM invoice_with_payments AS i2
     WHERE i2.design_id = i.design_id
       AND i2.paid_at IS NOT NULL
       AND i2.id != i.id
   ) = 0
     AND d.deleted_at IS NULL
  ) as pd
    ON pd.id = cd.design_id
  `).catch(rethrow);
  const collections: CollectionMeta[] = collectionsResult.rows;
  return db.transaction(async (trx: Knex.Transaction) => {
    const createPayloadsAndErrors: (PayloadObject | string)[] = await Promise.all(
      collections.map(async (collection: CollectionMeta) => {
        const fullCollection = await CollectionsDAO.findById(collection.id);
        const quotes = await getQuoteRequests(collection.id, trx);
        const designs = await ProductDesignsDAO.findByCollectionId(collection.id);
        if (quotes.length !== designs.length || !areQuotesAndDesignsMatched(quotes, designs)) {
          return collection.id;
        }
        if (!fullCollection) { return collection.id; }
        log(`INFO: Retrieved ${quotes.length} commited quotes for collection ${collection.id}`);
        return {
          collection: fullCollection,
          quotes,
          userId: collection.user_id
        };
      }));
    const errorCollectionIds = createPayloadsAndErrors
      .filter((el: PayloadObject | string): el is string => typeof el === 'string');
    if (errorCollectionIds.length > 0) {
      // tslint:disable-next-line:max-line-length
      log(`${red}ERROR: The following collections could not have an invoice automatically created due to the quotes and designs not matching: ${errorCollectionIds.join(', ')}${reset}`);
    }
    const createPayloads: PayloadObject[] = createPayloadsAndErrors
      .filter((el: PayloadObject | string): el is PayloadObject => typeof el !== 'string');

    const invoices = await Promise.all(createPayloads.map((createPayload: PayloadObject) => {
      return createInvoiceWithoutMethod(
        createPayload.quotes,
        createPayload.userId,
        createPayload.collection
      );
    }));
    return invoices.length;
  });
}

createInvoicesForPayLaterSubmits()
  .then((x: number) => {
    log(`${green}Successfully created invoices for ${x} collections!${reset}`);
    process.exit();
  })
  .catch((err: any): void => {
    log(`${red}ERROR:\n${reset}`, err);
    process.exit(1);
  });
