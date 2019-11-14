import process from 'process';
import uuid from 'node-uuid';
import { CALA_OPS_USER_ID } from '../config';
import { log, logServerError } from '../services/logger';
import { green, reset } from '../services/colors';

import { PromoCode } from '../components/promo-codes/domain-object';
import * as PromoCodesDAO from '../components/promo-codes/dao';

insertNewPromoCode()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch(
    (err: any): void => {
      logServerError(err);
      process.exit(1);
    }
  );

async function insertNewPromoCode(): Promise<void> {
  const code = process.argv[2];
  const creditAmountString = process.argv[3];
  const isSingleUse = process.argv[4] === '--singleUse';

  if (!code || !creditAmountString) {
    throw new Error(
      'Usage: insert-promo-code.ts <code> <amount in cents> [--singleUse]'
    );
  }

  const newCode: PromoCode = {
    code,
    codeExpiresAt: null,
    createdAt: new Date(),
    createdBy: CALA_OPS_USER_ID,
    creditAmountCents: Number(creditAmountString),
    creditExpiresAt: null,
    id: uuid.v4(),
    isSingleUse
  };

  const inserted = await PromoCodesDAO.create(newCode);

  log(`${reset}Inserted:
${JSON.stringify(inserted, null, 2)}
`);
}
