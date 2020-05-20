import daysToMs from "@cala/ts-lib/dist/time/days-to-ms";
import { sandbox, test, Test } from "../../../../test-helpers/fresh";

import { isExpired } from "./index";
import generateBid from "../../../../test-helpers/factories/bid";

const ONE_HOUR = 1000 * 60 * 60;

test("isExpired can determine if a bid is expired", async (t: Test) => {
  const now = new Date(2019, 5, 15);
  const threeDaysAgo = new Date(now.getTime() - daysToMs(3) - 1);
  const seventyOneHoursAgo = new Date(now.getTime() - daysToMs(3) + ONE_HOUR);
  const febFirst = new Date(2019, 1, 1);

  sandbox().useFakeTimers(febFirst);
  const { bid: bid2 } = await generateBid();

  sandbox().useFakeTimers(threeDaysAgo);
  const { bid: bid3 } = await generateBid({
    generatePricing: false,
  });

  sandbox().useFakeTimers(seventyOneHoursAgo);
  const { bid: bid4 } = await generateBid({
    generatePricing: false,
  });

  sandbox().useFakeTimers(now);
  const { bid: bid1 } = await generateBid({
    generatePricing: false,
  });

  t.false(isExpired(bid1), "Is not expired");
  t.true(isExpired(bid2), "Is expired");
  t.true(isExpired(bid3), "Is Expired");
  t.false(isExpired(bid4), "Is not expired");
});
