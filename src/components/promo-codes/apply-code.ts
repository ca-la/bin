import Knex from "knex";

import db from "../../services/db";
import InvalidDataError = require("../../errors/invalid-data");
import { CreditsDAO, CreditType } from "../credits";
import { findByCode, update } from "./dao";

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
      await CreditsDAO.create(trx, {
        type: CreditType.PROMO_CODE,
        createdBy: null,
        givenTo: userId,
        creditDeltaCents: promoCode.creditAmountCents,
        description: `Promo code applied: ${code}`,
        expiresAt: promoCode.creditExpiresAt,
        financingAccountId: null,
      });

      if (promoCode.isSingleUse) {
        await update(
          promoCode.id,
          {
            codeExpiresAt: new Date(),
          },
          trx
        );
      }

      return promoCode.creditAmountCents;
    }
  );
}
