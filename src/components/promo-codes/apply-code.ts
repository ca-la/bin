import InvalidDataError = require('../../errors/invalid-data');
import { addCredit } from '../credits/dao';
import { findByCode } from './dao';

type CreditedAmountCents = number;

export default async function applyCode(
  userId: string,
  code: string
): Promise<CreditedAmountCents> {
  const promoCode = await findByCode(code);

  if (!promoCode) { throw new InvalidDataError(`Invalid promo code: ${code}`); }

  await addCredit({
    amountCents: promoCode.creditAmountCents,
    createdBy: userId,
    description: `Promo code applied: ${code}`,
    expiresAt: promoCode.creditExpiresAt,
    givenTo: userId
  });

  return promoCode.creditAmountCents;
}
