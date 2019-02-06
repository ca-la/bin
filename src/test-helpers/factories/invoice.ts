import db = require('../../services/db');
import * as Knex from 'knex';

import Collection from '../../domain-objects/collection';
import { findById as findUserById } from '../../dao/users';
import * as CollectionsDAO from '../../dao/collections';
import * as InvoicesDAO from '../../dao/invoices';
import createUser = require('../create-user');
import Invoice from '../../domain-objects/invoice';
import generateCollection from './collection';
import User = require('../../domain-objects/user');

interface InvoiceWithResources {
  collection: Collection | null;
  userId: any;
  invoice: Invoice;
}

export default async function generateInvoice(
  options: Partial<Invoice> = {}
): Promise<InvoiceWithResources> {
  const { user }: { user: User } = options.userId
    ? { user: await findUserById(options.userId) }
    : await createUser({ withSession: false });

  const maybeCollection = options.collectionId
    ? await CollectionsDAO.findById(options.collectionId)
    : null;
  const { collection } = maybeCollection
    ? { collection: maybeCollection }
    : await generateCollection({ createdBy: user.id });

  const invoice = await db.transaction(async (trx: Knex.Transaction): Promise<Invoice> => {
    const { id } = await InvoicesDAO.createTrx(trx, {
      collectionId: collection.id,
      title: 'My First Invoice',
      totalCents: 1234
    });
    return await InvoicesDAO.findByIdTrx(trx, id);
  });

  return { invoice, userId: user, collection };
}
