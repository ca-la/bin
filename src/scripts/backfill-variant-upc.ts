import process from "process";
import { log, logServerError } from "../services/logger";
import { green, reset } from "../services/colors";

import * as VariantsDAO from "../components/product-design-variants/dao";
import { computeUniqueUpc } from "../services/codes/upc";

run()
  .then(() => {
    log(green, `Successfully backfilled!`, reset);
    process.exit();
  })
  .catch((err: any): void => {
    logServerError(err);
    process.exit(1);
  });

async function run(): Promise<void> {
  const variantIds = process.argv.slice(2);

  if (!variantIds) {
    throw new Error("Usage: backfill-variant-ups.ts [variantId]");
  }

  for (const variantId of variantIds) {
    const upc = await computeUniqueUpc();
    log(`Generated UPC ${upc} for variant ${variantId}`);
    await VariantsDAO.update(variantId, { universalProductCode: upc });
    log(green, "Saved variant", reset);
  }
}
