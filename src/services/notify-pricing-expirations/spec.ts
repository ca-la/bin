import { sandbox, test, Test } from "../../test-helpers/fresh";

import { notifyPricingExpirations } from "./index";
import * as ExpirationService from "./notify-expired";

test("notifyPricingExpirations will trigger notifications", async (t: Test) => {
  const expiredStub = sandbox()
    .stub(ExpirationService, "notifyExpired")
    .resolves(1);
  const oneWeekExpiredStub = sandbox()
    .stub(ExpirationService, "notifyOneWeekFromExpiring")
    .resolves(3);
  const twoDayExpiredStub = sandbox()
    .stub(ExpirationService, "notifyTwoDaysFromExpiring")
    .resolves(2);

  const result = await notifyPricingExpirations();
  t.deepEqual(result, {
    justNowCount: 1,
    oneWeekCount: 3,
    twoDayCount: 2,
  });
  t.equal(expiredStub.callCount, 1);
  t.equal(oneWeekExpiredStub.callCount, 1);
  t.equal(twoDayExpiredStub.callCount, 1);
});
