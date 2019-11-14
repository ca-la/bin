import Knex from 'knex';

import db from '../../services/db';
import InvalidDataError = require('../../errors/invalid-data');
import { addCredit } from '../credits/dao';
import { findByCode, update } from './dao';

type CreditedAmountCents = number;

export default async function applyCode(
  userId: string,
  code: string
): Promise<CreditedAmountCents> {
  const promoCode = await findByCode(code);

  if (!promoCode) {
    throw new InvalidDataError(`Invalid promo code: ${code}`);
  }

  return await db.transaction(
    async (trx: Knex.Transaction): Promise<CreditedAmountCents> => {
      await addCredit(
        {
          amountCents: promoCode.creditAmountCents,
          createdBy: userId,
          description: `Promo code applied: ${code}`,
          expiresAt: promoCode.creditExpiresAt,
          givenTo: userId
        },
        trx
      );

      if (promoCode.isSingleUse) {
        await update(
          promoCode.id,
          {
            codeExpiresAt: new Date()
          },
          trx
        );
      }

      return promoCode.creditAmountCents;
    }
  );
}
