import Knex from "knex";

import db from "../../services/db";
import {
  notifyExpired,
  notifyOneWeekFromExpiring,
  notifyTwoDaysFromExpiring,
} from "./notify-expired";

export interface ExpirationResponse {
  justNowCount: number;
  oneWeekCount: number;
  twoDayCount: number;
}

/**
 * Gathers all collections where the pricing is:
 * - One week from expiring
 * - 48 hours from expiring
 * - Has just expired
 * Then goes through to notify the collection owner of each expiration time frame.
 */
export async function notifyPricingExpirations(): Promise<ExpirationResponse> {
  let justNowCount = 0;
  let oneWeekCount = 0;
  let twoDayCount = 0;

  await db.transaction(
    async (trx: Knex.Transaction): Promise<void> => {
      justNowCount = await notifyExpired(trx);
      oneWeekCount = await notifyOneWeekFromExpiring(trx);
      twoDayCount = await notifyTwoDaysFromExpiring(trx);
    }
  );

  return {
    justNowCount,
    oneWeekCount,
    twoDayCount,
  };
}
