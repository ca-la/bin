import Knex, { Transaction } from "knex";
import { sortedIndexBy } from "lodash";

import db from "../../services/db";
import { buildDao } from "../../services/cala-component/cala-dao";
import { Credit, CreditRow } from "./types";
import adapter from "./adapter";
import uuid from "node-uuid";

const TABLE_NAME = "credit_transactions";

export const standardDao = buildDao<Credit, CreditRow>(
  "Credit",
  TABLE_NAME,
  adapter,
  {
    orderColumn: "created_at",
    excludeDeletedAt: false,
  }
);

async function getCreditAmount(
  userId: string,
  ktx: Knex = db
): Promise<number> {
  const records = await standardDao.find(ktx, { givenTo: userId });

  interface CreditBucket {
    amount: number;
    expiresAt: Date | null;
  }

  let creditBuckets: CreditBucket[] = [];
  let balance = 0;
  records.forEach((credit: Credit) => {
    const expiresAt = credit.expiresAt ? new Date(credit.expiresAt) : null;
    const deltaCents = Number(credit.creditDeltaCents);

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
      const spentAt = new Date(credit.createdAt);
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

async function create(
  trx: Transaction,
  blank: MaybeUnsaved<Credit>
): Promise<Credit> {
  if (blank.creditDeltaCents < 0) {
    // We acquire an update lock on the most recent transaction, if possible, to
    // ensure we don't remove the same "available" credit multiple times if
    // called in parallel
    await trx.raw(
      `select * from credit_transactions
where given_to = ?
order by created_at desc
limit 1
for update`,
      [blank.givenTo]
    );
  }

  const created = await standardDao.create(trx, {
    ...blank,
    id: blank.id || uuid.v4(),
    createdAt: new Date(),
  });
  const amount = await getCreditAmount(blank.givenTo, trx);
  if (amount < 0) {
    throw new Error(
      `Cannot remove ${-blank.creditDeltaCents} cents of credit from user ${
        blank.givenTo
      }; they only have ${
        BigInt(amount) - BigInt(blank.creditDeltaCents)
      } available`
    );
  }
  return created;
}

export default {
  ...standardDao,
  create,
  getCreditAmount,
};
