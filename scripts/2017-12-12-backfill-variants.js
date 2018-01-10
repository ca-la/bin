'use strict';

const db = require('../services/db');
const Logger = require('../services/logger');
const COLORS = require('../services/colors');

const ProductDesignVariantsDAO = require('../dao/product-design-variants');

async function backfill() {
  const rows = await db
    .select('*')
    .from('product_designs')
    .whereNotNull('units_to_produce');

  Logger.log(`${COLORS.yellow}Found ${rows.length} applicable designs${COLORS.reset}`);

  for (let i = 0; i < rows.length; i += 1) {
    Logger.log(`${COLORS.yellow}Updating ${rows[i].id}${COLORS.reset}`);
    const variants = await ProductDesignVariantsDAO.replaceForDesign(
      rows[i].id,
      [
        {
          sizeName: 'M',
          colorName: 'Color 1',
          unitsToProduce: rows[i].units_to_produce
        }
      ]
    );

    variants.forEach((variant) => {
      Logger.log(`${COLORS.green}Created variant (units: ${variant.unitsToProduce}, sizeName: ${variant.sizeName}, colorName: ${variant.colorName})${COLORS.reset}`);
    });
  }

  Logger.log(`${COLORS.green}fin.${COLORS.reset}`);
  process.exit(0);
}

backfill();
