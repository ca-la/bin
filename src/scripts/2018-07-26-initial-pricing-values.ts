import * as knex from 'knex';
import * as process from 'process';
import * as uuid from 'node-uuid';
import { PricingConstantRow } from '../domain-objects/pricing-constant';
import * as db from '../services/db';
import { Dollars } from '../services/dollars';
import { log } from '../services/logger';
import { green, red, reset, yellow } from '../services/colors';
import generateScreenPrintingProcess from '../services/generate-screen-printing-processes';
import generateProductTypes from '../services/generate-product-types';
import { PricingProductMaterialRow } from '../domain-objects/pricing-product-material';
import { PricingMarginRow } from '../domain-objects/pricing-margin';
import { PricingCareLabelRow } from '../domain-objects/pricing-care-label';

intialPricingValues()
  .then(() => {
    log(`${green}Successfully inserted!`);
    process.exit();
  })
  .catch((err: any): void => {
    log(`${red}ERROR:\n${reset}`, err);
    process.exit(1);
  });

async function intialPricingValues(): Promise<void> {
  const pricingProcessScreenPrinting = generateScreenPrintingProcess(
    (units: number): Dollars => Dollars(units >= 500 ? 30 : 60),
    Dollars(0.25),
    [
      [1, 100],
      [100, 85],
      [250, 85],
      [500, 70],
      [1000, 55],
      [1500, 40],
      [2000, 25]
    ],
    0
  );
  const pricingProductTypeTee = generateProductTypes(
    'Teeshirt',
    Dollars(20),
    1.5,
    [0.15, 0.5, 1],
    0
  );
  const createCareLabel = (units: number, cents: number): Uninserted<PricingCareLabelRow> => ({
    id: uuid.v4(),
    minimum_units: units,
    unit_cents: cents,
    version: 0
  });
  const pricingCareLabels: Uninserted<PricingCareLabelRow>[] = [
    createCareLabel(1, 36),
    createCareLabel(50, 26),
    createCareLabel(75, 25),
    createCareLabel(100, 22),
    createCareLabel(200, 18),
    createCareLabel(300, 15),
    createCareLabel(500, 13),
    createCareLabel(1000, 12),
    createCareLabel(1500, 11),
    createCareLabel(2000, 9),
    createCareLabel(3000, 7),
    createCareLabel(4000, 5)
  ];
  const pricingMargins: Uninserted<PricingMarginRow>[] = [
    {
      id: uuid.v4(),
      margin: 15,
      minimum_units: 1,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 14,
      minimum_units: 50,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 13,
      minimum_units: 100,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 12,
      minimum_units: 150,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 11,
      minimum_units: 200,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 10,
      minimum_units: 300,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 9,
      minimum_units: 500,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 8,
      minimum_units: 1000,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 7,
      minimum_units: 1750,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 6,
      minimum_units: 3000,
      version: 0
    },
    {
      id: uuid.v4(),
      margin: 5,
      minimum_units: 4500,
      version: 0
    }
  ];
  const pricingConstants: Uninserted<PricingConstantRow>[] = [
    {
      branded_labels_additional_cents: 5,
      branded_labels_minimum_cents: Dollars(255),
      branded_labels_minimum_units: 1000,
      grading_cents: Dollars(50),
      id: uuid.v4(),
      marking_cents: Dollars(50),
      pattern_revision_cents: Dollars(50),
      sample_minimum_cents: Dollars(75),
      technical_design_cents: Dollars(50),
      working_session_cents: Dollars(25)
    }
  ];
  const pricingMaterials: Uninserted<PricingProductMaterialRow>[] = [
    {
      category: 'Basic',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(5),
      version: 0
    },
    {
      category: 'Standard',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(10),
      version: 0
    },
    {
      category: 'Luxe',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(15),
      version: 0
    },
    {
      category: 'Ultra-luxe',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(25),
      version: 0
    },
    {
      category: 'Basic',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(4),
      version: 0
    },
    {
      category: 'Standard',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(8),
      version: 0
    },
    {
      category: 'Luxe',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(11),
      version: 0
    },
    {
      category: 'Ultra-luxe',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(19),
      version: 0
    }
  ];
  const expectedCount = pricingProcessScreenPrinting.length +
    pricingCareLabels.length +
    pricingConstants.length +
    pricingMargins.length +
    pricingMaterials.length +
    pricingProductTypeTee.length;

  log(`${yellow}Attempting to insert ${reset}${expectedCount} ${yellow}rows...`);

  return db.transaction(async (trx: knex.Transaction) => {
    const inserted: any[] = [
      await trx.insert(pricingProcessScreenPrinting).into('pricing_processes'),
      await trx.insert(pricingConstants).into('pricing_constants'),
      await trx.insert(pricingCareLabels).into('pricing_care_labels'),
      await trx.insert(pricingMargins).into('pricing_margins'),
      await trx.insert(pricingMaterials).into('pricing_product_materials'),
      await trx.insert(pricingProductTypeTee).into('pricing_product_types')
    ];

    const rowCount = inserted.reduce(
      (sum: number, rows: any) => sum + rows.rowCount,
      0
    );

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
