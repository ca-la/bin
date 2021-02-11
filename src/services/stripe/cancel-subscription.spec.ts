import * as Fetch from "../fetch";

import { sandbox, test, Test } from "../../test-helpers/fresh";
import { cancelSubscription } from "./cancel-subscription";

test("cancelSubscription calls the correct api", async (t: Test) => {
  const now = new Date();
  const fakeResponse = {
    headers: {
      get(): string {
        return "application/json";
      },
    },
    status: 200,
    json(): object {
      return {
        id: "sub_123",
        status: "active",
        canceled_at: Math.floor(now.getTime() / 1000),
      };
    },
  };

  const fetchStub = sandbox().stub(Fetch, "fetch").resolves(fakeResponse);
  const cancelledAt = await cancelSubscription("sub_123");

  t.equal(fetchStub.callCount, 1);
  t.equal(
    fetchStub.firstCall.args[0],
    "https://api.stripe.com/v1/subscriptions/sub_123"
  );
  t.equal(fetchStub.firstCall.args[1].method, "delete");

  t.equal(cancelledAt.getTime(), Math.floor(now.getTime() / 1000) * 1000);
});
