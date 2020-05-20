import { test, Test } from "../../test-helpers/fresh";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import * as PricingProcessesDAO from "./index";

test("PricingProcessesDAO.findLatestProcesses", async (t: Test) => {
  await generatePricingValues();

  const processes = await PricingProcessesDAO.findLatest();

  t.deepEqual(processes, [
    { name: "SCREEN_PRINTING", complexity: "1_COLOR" },
    { name: "SCREEN_PRINTING", complexity: "2_COLORS" },
    { name: "SCREEN_PRINTING", complexity: "3_COLORS" },
    { name: "SCREEN_PRINTING", complexity: "4_COLORS" },
    { name: "SCREEN_PRINTING", complexity: "5_COLORS" },
    { name: "SCREEN_PRINTING", complexity: "6_COLORS" },
    { name: "SCREEN_PRINTING", complexity: "7_COLORS" },
    { name: "SCREEN_PRINTING", complexity: "8_COLORS" },
    { name: "SCREEN_PRINTING", complexity: "9_COLORS" },
  ]);
});
