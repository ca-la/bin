import Knex from 'knex';
import uuid from 'node-uuid';
import { sortedIndexBy } from 'lodash';

import db from '../../services/db';

const TABLE_NAME = 'credit_transactions';

interface CreditOptions {
  description: string;
  amountCents: number;
  createdBy: string;
  givenTo: string;
}

interface Row {
  created_at: string;
  created_by: string;
  credit_delta_cents: number;
  description: string;
  expires_at: string | null;
  id: string;
  given_to: string;
}

interface AddCreditOptions extends CreditOptions {
  expiresAt: Date | null;
}

function validateAmount(amountCents: number): void {
  if (amountCents < 1 || amountCents % 1 !== 0) {
    throw new Error(
      `${amountCents} cents of credit must be a positive integer`
    );
  }
}

export async function addCredit(
  options: AddCreditOptions,
  trx?: Knex.Transaction
): Promise<void> {
  const { amountCents } = options;

  validateAmount(amountCents);

  await db(TABLE_NAME)
    .insert(
      {
        created_at: new Date(),
        created_by: options.createdBy,
        credit_delta_cents: amountCents,
        description: options.description,
        expires_at: options.expiresAt,
        given_to: options.givenTo,
        id: uuid.v4()
      },
      '*'
    )
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });
}

export async function removeCredit(
  options: CreditOptions,
  trx: Knex.Transaction
): Promise<void> {
  const { amountCents } = options;
  validateAmount(amountCents);

  // We acquire an update lock on the most recent transaction, if possible, to
  // ensure we don't remove the same "available" credit multiple times if
  // called in parallel
  await db
    .raw(
      `
    select * from credit_transactions
    where given_to = ?
    order by created_at desc
    limit 1
    for update`,
      [options.givenTo]
    )
    .transacting(trx);

  const availableAmount = await getCreditAmount(options.givenTo, trx);

  if (amountCents > availableAmount) {
    throw new Error(
      `Cannot remove ${amountCents} cents of credit from user ${
        options.givenTo
      }; ` + `they only have ${availableAmount} available`
    );
  }

  await db(TABLE_NAME)
    .insert(
      {
        created_at: new Date(),
        created_by: options.createdBy,
        credit_delta_cents: -1 * amountCents,
        description: options.description,
        given_to: options.givenTo,
        id: uuid.v4()
      },
      '*'
    )
    .transacting(trx);
}

export async function getCreditAmount(
  userId: string,
  trx?: Knex.Transaction
): Promise<number> {
  const records = await db(TABLE_NAME)
    .where({ given_to: userId })
    .orderBy('created_at', 'asc')
    .modify((query: Knex.QueryBuilder) => {
      if (trx) {
        query.transacting(trx);
      }
    });

  interface CreditBucket {
    amount: number;
    expiresAt: Date | null;
  }

  let creditBuckets: CreditBucket[] = [];
  let balance = 0;

  records.forEach((row: Row) => {
    const expiresAt = row.expires_at ? new Date(row.expires_at) : null;
    const deltaCents = Number(row.credit_delta_cents);

    if (deltaCents > 0) {
      // Add credit bucket in the right spot to ensure they're sorted by
      // expiration
      const newBucket: CreditBucket = { amount: deltaCents, expiresAt };
      const bucketIndex = sortedIndexBy(
        creditBuckets,
        newBucket,
        (b: CreditBucket): number => {
          if (b.expiresAt === null) {
            return Infinity;
          }
          return b.expiresAt.getTime();
        }
      );
      creditBuckets.splice(bucketIndex, 0, newBucket);
    } else {
      // Subtract from available credit buckets, and take the remainder off the
      // balance
      let leftToSpend = -1 * deltaCents;
      const spentAt = new Date(row.created_at);

      creditBuckets = creditBuckets.filter((bucket: CreditBucket) => {
        if (bucket.expiresAt && bucket.expiresAt < spentAt) {
          return false;
        }

        bucket.amount -= leftToSpend;
        leftToSpend = 0;

        // If that took the bucket amount to or below 0, add the remainder back
        // to our balance and remove the bucket.
        if (bucket.amount <= 0) {
          leftToSpend = -1 * bucket.amount;
          return false;
        }

        return true;
      });

      balance -= leftToSpend;
    }
  });

  // Add up remaining un-spent buckets to see what credit is still available
  creditBuckets.forEach((bucket: CreditBucket) => {
    if (bucket.expiresAt && bucket.expiresAt < new Date()) {
      return;
    }

    balance += bucket.amount;
  });

  return balance;
}
