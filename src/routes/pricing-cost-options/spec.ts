import { test, Test } from "../../test-helpers/fresh";
import generatePricingValues from "../../test-helpers/factories/pricing-values";
import { authHeader, get } from "../../test-helpers/http";
import createUser = require("../../test-helpers/create-user");

test("GET /pricing-cost-options", async (t: Test) => {
  const { session } = await createUser({ role: "ADMIN" });
  await generatePricingValues();

  const [response, options] = await get("/pricing-cost-options", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);
  t.deepEqual(options, {
    complexities: ["BLANK", "COMPLEX", "MEDIUM", "SIMPLE"],
    materialCategories: ["BASIC", "LUXE", "STANDARD", "ULTRA_LUXE"],
    processes: [
      { name: "SCREEN_PRINT", complexity: "1_COLOR" },
      { name: "SCREEN_PRINT", complexity: "2_COLORS" },
      { name: "SCREEN_PRINT", complexity: "3_COLORS" },
      { name: "SCREEN_PRINT", complexity: "4_COLORS" },
      { name: "SCREEN_PRINT", complexity: "5_COLORS" },
      { name: "SCREEN_PRINT", complexity: "6_COLORS" },
      { name: "SCREEN_PRINT", complexity: "7_COLORS" },
      { name: "SCREEN_PRINT", complexity: "8_COLORS" },
      { name: "SCREEN_PRINT", complexity: "9_COLORS" },
    ],
    types: ["TEESHIRT"],
  });
});
