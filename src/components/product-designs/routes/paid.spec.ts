import * as ProductDesignsDAO from "../dao/dao";

import SessionsDAO from "../../../dao/sessions";
import { authHeader, get } from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/simple";
import { staticProductDesign } from "../../../test-helpers/factories/product-design";

test("GET /product-designs?paid=true lists paid designs", async (t: Test) => {
  const sessionStub = sandbox().stub(SessionsDAO, "findById").resolves({
    id: "a-session-id",
    role: "USER",
    userId: "a-user-id",
  });

  const design = staticProductDesign();

  const findStub = sandbox()
    .stub(ProductDesignsDAO, "findPaidDesigns")
    .resolves([design]);

  const [response] = await get(`/product-designs?paid=true`, {
    headers: authHeader("a-session-id"),
  });

  t.equal(response.status, 403, "Regular users cannot access paid designs");

  sessionStub.resolves({
    id: "a-session-id",
    role: "ADMIN",
    userId: "an-admin-id",
  });

  const [response2, body2] = await get(
    `/product-designs?paid=true&limit=5&offset=2&productType=TEESHIRT`,
    {
      headers: authHeader("a-session-id"),
    }
  );

  t.equal(response2.status, 200, "Admins can access paid designs");
  t.equal(body2.length, 1, "Returns paid designs");
  t.equal(body2[0].id, design.id, "Returns paid designs");

  t.equal(findStub.callCount, 1);
  t.deepEqual(findStub.lastCall.args[1], {
    limit: 5,
    offset: 2,
    productType: "TEESHIRT",
  });
});
