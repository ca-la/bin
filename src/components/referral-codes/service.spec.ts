import { test, Test } from "../../test-helpers/fresh";

import { generateReferralCode } from "./service";

test("generateReferralCode generates referral codes", async (t: Test) => {
  const code = await generateReferralCode();
  t.true(
    code.length >= 5,
    "The initial identifier is at least 5 characters long."
  );

  const [code2, code3] = await Promise.all([
    generateReferralCode(),
    generateReferralCode(),
  ]);

  t.notEqual(code, code2, "Codes generated in series are not identical");
  t.notEqual(code2, code3, "Codes generated in parallel are not identical");
});
