
import * as knex from 'knex';
import * as process from 'process';
import { flatten, map } from 'lodash';
import sum from '../services/sum';
import * as db from '../services/db';
import { Dollars } from '../services/dollars';
import { log } from '../services/logger';
import { green, red, reset, yellow } from '../services/colors';
import generateProductTypes from '../services/generate-product-types';
import { PricingProductTypeRow } from '../domain-objects/pricing-product-type';

createPricing()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch((err: any): void => {
    log(`${red}ERROR:\n${reset}`, err);
    process.exit(1);
  });

async function createPricing(): Promise<void> {
  const pricingProductTypes: Uninserted<PricingProductTypeRow>[] = flatten([
    generateProductTypes(
      'SUNGLASSES',
      Dollars(15),
      1,
      [0.15, 0.5, 1],
      0
    ),
    generateProductTypes(
      'TOPCOAT',
      Dollars(75),
      2.25,
      [0.15, 0.5, 1],
      0
    ),
    generateProductTypes(
      'BACKPACK',
      Dollars(45),
      1.5,
      [0.15, 0.5, 1],
      0
    )
  ]);

  const expectedCount = pricingProductTypes.length;

  log(`${yellow}Attempting to insert ${reset}${expectedCount} ${yellow}rows...`);

  return db.transaction(async (trx: knex.Transaction) => {
    const inserted: any[] = [
      await trx.insert(pricingProductTypes).into('pricing_product_types')
    ];

    const rowCount = sum(map(inserted, 'rowCount'));

    if (rowCount !== expectedCount) {
      return trx.rollback(`
${red}Not all rows were inserted!
${reset}Expected ${yellow}${expectedCount}${reset}, but got ${red}${rowCount}${reset}.

Dump of returned rows:

${JSON.stringify(inserted, null, 4)}
`);
    }
  });
}
