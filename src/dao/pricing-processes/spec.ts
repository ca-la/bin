import { test, Test } from "../../test-helpers/fresh";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import * as PricingProcessesDAO from "./index";

test("PricingProcessesDAO.findLatestProcesses", async (t: Test) => {
  await generatePricingValues();

  const processes = await PricingProcessesDAO.findLatest();

  t.deepEqual(processes, [
    { name: "SCREEN_PRINT", complexity: "1_COLOR" },
    { name: "SCREEN_PRINT", complexity: "2_COLORS" },
    { name: "SCREEN_PRINT", complexity: "3_COLORS" },
    { name: "SCREEN_PRINT", complexity: "4_COLORS" },
    { name: "SCREEN_PRINT", complexity: "5_COLORS" },
    { name: "SCREEN_PRINT", complexity: "6_COLORS" },
    { name: "SCREEN_PRINT", complexity: "7_COLORS" },
    { name: "SCREEN_PRINT", complexity: "8_COLORS" },
    { name: "SCREEN_PRINT", complexity: "9_COLORS" },
  ]);
});
