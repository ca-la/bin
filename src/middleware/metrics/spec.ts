import Koa from "koa";
import Sinon from "sinon";

import metrics from ".";
import * as Analytics from "../../services/analytics";
import { sandbox, test, Test } from "../../test-helpers/fresh";

test("Metrics middleware reports metrics", async (t: Test) => {
  const ctx = ({
    originalUrl: "/designs/d856c262-c7a0-4e1e-98f1-84dad67c9702",
    request: {
      method: "PUT",
    },
  } as unknown) as Koa.Context;

  const nextStub = sandbox().stub();
  const metricsStub = (Analytics.trackMetric as unknown) as Sinon.SinonStub;
  metricsStub.resetHistory();

  const result = metrics.call(ctx, nextStub);
  result.next();
  result.next();

  t.equal(metricsStub.callCount, 1);
  t.equal(metricsStub.firstCall.args[0], "Response Time: PUT /designs/:id");
});
