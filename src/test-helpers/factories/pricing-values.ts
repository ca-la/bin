import * as knex from 'knex';
import { map } from 'lodash';
import * as uuid from 'node-uuid';
import db = require('../../services/db');
import { Dollars } from '../../services/dollars';
import sum from '../../services/sum';
import { PricingConstantRow } from '../../domain-objects/pricing-constant';
import generateScreenPrintingProcess from '../../services/generate-screen-printing-processes';
import generateProductTypes from '../../services/generate-product-types';
import { PricingProductMaterialRow } from '../../domain-objects/pricing-product-material';
import { PricingMarginRow } from '../../domain-objects/pricing-margin';
import { PricingCareLabelRow } from '../../domain-objects/pricing-care-label';

export default async function generatePricingValues(): Promise<any> {
  const pricingProcessScreenPrinting = generateScreenPrintingProcess(
    (): number => 3000,
    25,
    [[1, 100], [100, 85]],
    0
  );
  const pricingProductTypeTee = generateProductTypes(
    'TEESHIRT',
    Dollars(20),
    1.5,
    [0.15, 0.5, 1, 0],
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
    createCareLabel(100, 22)
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
      unit_cents: Dollars(5),
      version: 0
    },
    {
      category: 'STANDARD',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(10),
      version: 0
    },
    {
      category: 'LUXE',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(15),
      version: 0
    },
    {
      category: 'ULTRA_LUXE',
      id: uuid.v4(),
      minimum_units: 1,
      unit_cents: Dollars(25),
      version: 0
    },
    {
      category: 'BASIC',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(4),
      version: 0
    },
    {
      category: 'STANDARD',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(8),
      version: 0
    },
    {
      category: 'LUXE',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(11),
      version: 0
    },
    {
      category: 'ULTRA_LUXE',
      id: uuid.v4(),
      minimum_units: 500,
      unit_cents: Dollars(19),
      version: 0
    }
  ];

  const expectedCount = sum([
    pricingProcessScreenPrinting.length,
    pricingCareLabels.length,
    pricingConstants.length,
    pricingMargins.length,
    pricingMaterials.length,
    pricingProductTypeTee.length
  ]);

  return db.transaction(async (trx: knex.Transaction) => {
    const inserted: any[] = [
      await trx.insert(pricingProcessScreenPrinting).into('pricing_processes'),
      await trx.insert(pricingConstants).into('pricing_constants'),
      await trx.insert(pricingCareLabels).into('pricing_care_labels'),
      await trx.insert(pricingMargins).into('pricing_margins'),
      await trx.insert(pricingMaterials).into('pricing_product_materials'),
      await trx.insert(pricingProductTypeTee).into('pricing_product_types')
    ];

    const rowCount = sum(map(inserted, 'rowCount'));

    if (rowCount !== expectedCount) {
      return trx.rollback('There was a problem setting up the pricing values');
    }
  });
}
