import * as knex from 'knex';
import * as process from 'process';
import * as uuid from 'node-uuid';
import { flatten, map } from 'lodash';
import { PricingConstantRow } from '../domain-objects/pricing-constant';
import sum from '../services/sum';
import * as db from '../services/db';
import { Cents, Dollars } from '../services/dollars';
import { log } from '../services/logger';
import { green, red, reset, yellow } from '../services/colors';
import generateScreenPrintingProcess from '../services/generate-screen-printing-processes';
import generateProductTypes from '../services/generate-product-types';
import { PricingProductMaterialRow } from '../domain-objects/pricing-product-material';
import { PricingMarginRow } from '../domain-objects/pricing-margin';
import { PricingCareLabelRow } from '../domain-objects/pricing-care-label';
import { PricingProcessRow } from '../domain-objects/pricing-process';
import { PricingProductTypeRow } from '../domain-objects/pricing-product-type';

// BUMP THIS BETWEEN EVERY RUN
const version = 2;

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
  const pricingProcessesScreenPrinting: Uninserted<PricingProcessRow>[] =
    generateScreenPrintingProcess(
      (units: number): Cents => Dollars(units >= 500 ? 30 : 60),
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
      version
    );
  const pricingProcessesEmbroidery: Uninserted<PricingProcessRow>[] = [
    {
      complexity: 'SMALL',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'EMBROIDERY',
      setup_cents: Dollars(200),
      unit_cents: Dollars(5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'EMBROIDERY',
      setup_cents: Dollars(200),
      unit_cents: Dollars(10),
      version
    },
    {
      complexity: 'LARGE',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'EMBROIDERY',
      setup_cents: Dollars(200),
      unit_cents: Dollars(20),
      version
    },
    {
      complexity: 'SMALL',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(10),
      version
    },
    {
      complexity: 'LARGE',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(15),
      version
    },
    {
      complexity: 'SMALL',
      id: uuid.v4(),
      minimum_units: 50,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 50,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(9),
      version
    },
    {
      complexity: 'LARGE',
      id: uuid.v4(),
      minimum_units: 50,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(14),
      version
    },
    {
      complexity: 'SMALL',
      id: uuid.v4(),
      minimum_units: 250,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 250,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(8),
      version
    },
    {
      complexity: 'LARGE',
      id: uuid.v4(),
      minimum_units: 250,
      name: 'EMBROIDERY',
      setup_cents: Dollars(50),
      unit_cents: Dollars(13),
      version
    },
    {
      complexity: 'SMALL',
      id: uuid.v4(),
      minimum_units: 500,
      name: 'EMBROIDERY',
      setup_cents: Dollars(35),
      unit_cents: Dollars(1),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 500,
      name: 'EMBROIDERY',
      setup_cents: Dollars(35),
      unit_cents: Dollars(3),
      version
    },
    {
      complexity: 'LARGE',
      id: uuid.v4(),
      minimum_units: 500,
      name: 'EMBROIDERY',
      setup_cents: Dollars(70),
      unit_cents: Dollars(5),
      version
    },
    {
      complexity: 'SMALL',
      id: uuid.v4(),
      minimum_units: 1200,
      name: 'EMBROIDERY',
      setup_cents: Dollars(35),
      unit_cents: Dollars(1),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1200,
      name: 'EMBROIDERY',
      setup_cents: Dollars(35),
      unit_cents: Dollars(3),
      version
    },
    {
      complexity: 'LARGE',
      id: uuid.v4(),
      minimum_units: 1200,
      name: 'EMBROIDERY',
      setup_cents: Dollars(70),
      unit_cents: Dollars(3.5),
      version
    }
  ];
  const pricingProcessesWash: Uninserted<PricingProcessRow>[] = [
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'WASH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(2),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'WASH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(7),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'WASH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(13),
      version
    },
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'WASH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(1.5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'WASH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(6),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'WASH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(11),
      version
    },
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'WASH',
      setup_cents: 0,
      unit_cents: Dollars(1.5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'WASH',
      setup_cents: 0,
      unit_cents: Dollars(6),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'WASH',
      setup_cents: 0,
      unit_cents: Dollars(11),
      version
    }
  ];
  const pricingProcessesDye: Uninserted<PricingProcessRow>[] = [
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'DYE',
      setup_cents: Dollars(35),
      unit_cents: Dollars(0.5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'DYE',
      setup_cents: Dollars(35),
      unit_cents: Dollars(2.25),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'DYE',
      setup_cents: Dollars(35),
      unit_cents: Dollars(4),
      version
    },
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'DYE',
      setup_cents: 0,
      unit_cents: Dollars(0.5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'DYE',
      setup_cents: 0,
      unit_cents: Dollars(2.25),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'DYE',
      setup_cents: 0,
      unit_cents: Dollars(4),
      version
    },
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'DYE',
      setup_cents: 0,
      unit_cents: Dollars(0.25),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'DYE',
      setup_cents: 0,
      unit_cents: Dollars(1.5),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'DYE',
      setup_cents: 0,
      unit_cents: Dollars(2),
      version
    }
  ];
  const pricingProcessesDistress: Uninserted<PricingProcessRow>[] = [
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'DISTRESS',
      setup_cents: Dollars(35),
      unit_cents: Dollars(1.5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'DISTRESS',
      setup_cents: Dollars(35),
      unit_cents: Dollars(6),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'DISTRESS',
      setup_cents: Dollars(35),
      unit_cents: Dollars(11),
      version
    },
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'DISTRESS',
      setup_cents: 0,
      unit_cents: Dollars(1.5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'DISTRESS',
      setup_cents: 0,
      unit_cents: Dollars(6),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'DISTRESS',
      setup_cents: 0,
      unit_cents: Dollars(11),
      version
    },
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'DISTRESS',
      setup_cents: 0,
      unit_cents: Dollars(0.75),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'DISTRESS',
      setup_cents: 0,
      unit_cents: Dollars(3),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'DISTRESS',
      setup_cents: 0,
      unit_cents: Dollars(5.5),
      version
    }
  ];
  const pricingProcessesEmbellish: Uninserted<PricingProcessRow>[] = [
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'EMBELLISH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(1.5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'EMBELLISH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(6),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 1,
      name: 'EMBELLISH',
      setup_cents: Dollars(35),
      unit_cents: Dollars(11),
      version
    },
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'EMBELLISH',
      setup_cents: 0,
      unit_cents: Dollars(1.5),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'EMBELLISH',
      setup_cents: 0,
      unit_cents: Dollars(6),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 25,
      name: 'EMBELLISH',
      setup_cents: 0,
      unit_cents: Dollars(11),
      version
    },
    {
      complexity: 'SIMPLE',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'EMBELLISH',
      setup_cents: 0,
      unit_cents: Dollars(0.75),
      version
    },
    {
      complexity: 'MEDIUM',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'EMBELLISH',
      setup_cents: 0,
      unit_cents: Dollars(3),
      version
    },
    {
      complexity: 'COMPLEX',
      id: uuid.v4(),
      minimum_units: 1000,
      name: 'EMBELLISH',
      setup_cents: 0,
      unit_cents: Dollars(5.5),
      version
    }
  ];

  const contrasts: [number, number, number, number] = [0.15, 0.5, 1, 0];

  const pricingProductTypes: Uninserted<PricingProductTypeRow>[] = flatten([
    generateProductTypes(
      'BACKPACK',
      Dollars(45),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'TOPCOAT',
      Dollars(75),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'SUNGLASSES',
      Dollars(15),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'TEESHIRT',
      Dollars(12),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'BLOUSE',
      Dollars(15),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'BLAZER',
      Dollars(56),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'DRESS',
      Dollars(24),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'SHORTS',
      Dollars(25),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'PANTS',
      Dollars(29.5),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'SKIRT',
      Dollars(19.5),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'LONG SKIRT',
      Dollars(40),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'COAT',
      Dollars(65),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'LONGSLEEVE TEESHIRT',
      Dollars(12),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'DRESS SHIRT',
      Dollars(20),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'SHORTSLEEVE DRESS SHIRT',
      Dollars(15),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'SWEATSHIRT',
      Dollars(15),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'HOODED SWEATSHIRT',
      Dollars(25),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'UNDERWEAR',
      Dollars(10),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'JACKET',
      Dollars(45),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'SWEATER',
      Dollars(38),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'SPORT COAT',
      Dollars(75),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'BATHROBE',
      Dollars(35),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'TIE',
      Dollars(25),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'PURSE',
      Dollars(20),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'WALLET',
      Dollars(30),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'SMALL BAG',
      Dollars(30),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'LARGE BAG',
      Dollars(73),
      1,
      contrasts,
      version
    ),
    generateProductTypes(
      'TANK TOP',
      Dollars(5),
      1,
      contrasts,
      version
    )
  ]);
  const createCareLabel = (units: number, cents: number): Uninserted<PricingCareLabelRow> => ({
    id: uuid.v4(),
    minimum_units: units,
    unit_cents: cents,
    version
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
      version
    },
    {
      id: uuid.v4(),
      margin: 14,
      minimum_units: 50,
      version
    },
    {
      id: uuid.v4(),
      margin: 13,
      minimum_units: 100,
      version
    },
    {
      id: uuid.v4(),
      margin: 12,
      minimum_units: 150,
      version
    },
    {
      id: uuid.v4(),
      margin: 11,
      minimum_units: 200,
      version
    },
    {
      id: uuid.v4(),
      margin: 10,
      minimum_units: 300,
      version
    },
    {
      id: uuid.v4(),
      margin: 9,
      minimum_units: 500,
      version
    },
    {
      id: uuid.v4(),
      margin: 8,
      minimum_units: 1000,
      version
    },
    {
      id: uuid.v4(),
      margin: 7,
      minimum_units: 1750,
      version
    },
    {
      id: uuid.v4(),
      margin: 6,
      minimum_units: 3000,
      version
    },
    {
      id: uuid.v4(),
      margin: 5,
      minimum_units: 4500,
      version
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
      category: 'BASIC',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(3),
      version
    },
    {
      category: 'STANDARD',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(8),
      version
    },
    {
      category: 'LUXE',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(13),
      version
    },
    {
      category: 'ULTRA_LUXE',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(20),
      version
    },
    {
      category: 'SPECIFY',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(0),
      version
    },
    {
      category: 'BASIC',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(2),
      version
    },
    {
      category: 'STANDARD',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(6),
      version
    },
    {
      category: 'LUXE',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(10),
      version
    },
    {
      category: 'ULTRA_LUXE',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(15),
      version
    }
  ];
  const expectedCount = sum([
    pricingProductTypes.length,
    pricingProcessesScreenPrinting.length,
    pricingProcessesEmbroidery.length,
    pricingProcessesWash.length,
    pricingProcessesDye.length,
    pricingProcessesDistress.length,
    pricingProcessesEmbellish.length,
    pricingCareLabels.length,
    pricingConstants.length,
    pricingMargins.length,
    pricingMaterials.length
  ]);

  log(`${yellow}Attempting to insert ${reset}${expectedCount} ${yellow}rows...`);

  return db.transaction(async (trx: knex.Transaction) => {
    const inserted: any[] = [
      await trx.insert(pricingProcessesScreenPrinting).into('pricing_processes'),
      await trx.insert(pricingProcessesEmbroidery).into('pricing_processes'),
      await trx.insert(pricingProcessesWash).into('pricing_processes'),
      await trx.insert(pricingProcessesDye).into('pricing_processes'),
      await trx.insert(pricingProcessesDistress).into('pricing_processes'),
      await trx.insert(pricingProcessesEmbellish).into('pricing_processes'),
      await trx.insert(pricingConstants).into('pricing_constants'),
      await trx.insert(pricingCareLabels).into('pricing_care_labels'),
      await trx.insert(pricingMargins).into('pricing_margins'),
      await trx.insert(pricingMaterials).into('pricing_product_materials'),
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
