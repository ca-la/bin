import process from "process";
import meow from "meow";
import uuid from "node-uuid";

import { log, logServerError } from "../../services/logger";
import { format, green, yellow } from "../../services/colors";
import db from "../../services/db";
import { PricingUnitMaterialMultipleRow } from "../../components/pricing-unit-material-multiple/types";

const HELP_TEXT = `
Fill existing prices with the first default (1) unit material multiple data
- reference to multiple in pricing_inputs
- version of unit material multiple in pricing_cost_inputs
In order to run this script the default first (zero) version of unit material multiple data should
exists in the DB.

Usage
$ bin/run [environment] src/scripts/one-off/2021-06-30-backfill-pricing-with-unit-material-multiple.ts [--dry-run]
`;

const cli = meow(HELP_TEXT, {
  flags: {
    dryRun: {
      default: false,
      type: "boolean",
    },
  },
});

async function main(): Promise<string> {
  const isDryRun = cli.flags.dryRun;

  const unitMaterialMultiplesNumber = await db.raw(
    `SELECT count(*) FROM pricing_unit_material_multiples;`
  );
  if (Number(unitMaterialMultiplesNumber.rows[0].count) > 0) {
    throw new Error("pricing_unit_material_multiples table is not empty");
  }

  let updatedPricingInputsCount;
  let updatedPricingCostInputsCount;
  let materialMultiple;
  const trx = await db.transaction();
  try {
    const unitMaterialMultiples = await trx<PricingUnitMaterialMultipleRow>(
      "pricing_unit_material_multiples"
    )
      .insert({
        id: uuid.v4(),
        created_at: new Date(),
        version: 0,
        minimum_units: 1,
        multiple: 1,
      })
      .returning("*");

    if (unitMaterialMultiples.length !== 1) {
      throw new Error(
        `Insert in to the pricing_unit_material_multiples table should return 1 record, actual: ${unitMaterialMultiples.length}`
      );
    }

    materialMultiple = unitMaterialMultiples[0];
    const pricingInputsIds = await trx("pricing_inputs").update(
      {
        pricing_unit_material_multiple_id: materialMultiple.id,
      },
      "id"
    );
    updatedPricingInputsCount = pricingInputsIds.length;

    const pricingCostInputsIds = await trx("pricing_cost_inputs").update(
      {
        unit_material_multiple_version: materialMultiple.version,
      },
      "id"
    );
    updatedPricingCostInputsCount = pricingCostInputsIds.length;
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  log(
    format(
      green,
      `Added zero version of the unit material multiple: ${JSON.stringify(
        materialMultiple,
        null,
        2
      )}`
    )
  );
  log(
    format(
      green,
      `Updated ${updatedPricingInputsCount} pricing_inputs with pricing_unit_material_multiple_id`
    )
  );
  log(
    format(
      green,
      `Updated ${updatedPricingCostInputsCount} pricing_cost_inputs with 0 in unit_material_multiple_version`
    )
  );

  if (isDryRun) {
    await trx.rollback();
    return format(yellow, "Transaction rolled back.");
  }

  await trx.commit();
  return format(green, "Success!");
}

main()
  .catch((err: any) => {
    logServerError(err);
    process.exit(1);
  })
  .then((message: string) => {
    log(message);
    process.exit(0);
  });
