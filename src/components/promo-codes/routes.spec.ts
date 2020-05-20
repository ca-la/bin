import tape from "tape";

import * as applyCode from "./apply-code";
import * as PromoCodesDAO from "./dao";
import createUser = require("../../test-helpers/create-user");
import InvalidDataError = require("../../errors/invalid-data");
import { authHeader, post } from "../../test-helpers/http";
import { sandbox, test } from "../../test-helpers/fresh";

test("POST /promo-codes/:id/redeem returns 404 on invalid code", async (t: tape.Test) => {
  const applyStub = sandbox()
    .stub(applyCode, "default")
    .rejects(new InvalidDataError("Invalid promo code: freeBie"));

  const { session, user } = await createUser();

  const [response, body] = await post("/promo-codes/freeBie/redeem", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 404);
  t.equal(body.message, "Invalid promo code: freeBie");
  t.deepEqual(applyStub.firstCall.args, [user.id, "freeBie"]);
});

test("POST /promo-codes/:id/redeem applies a valid code", async (t: tape.Test) => {
  const applyStub = sandbox().stub(applyCode, "default").resolves(1239);

  const { session, user } = await createUser();

  await PromoCodesDAO.create({
    code: "FREEBIE",
    codeExpiresAt: null,
    createdBy: user.id,
    creditAmountCents: 1239,
    creditExpiresAt: null,
    isSingleUse: false,
  });

  const [response, body] = await post("/promo-codes/freeBie/redeem", {
    headers: authHeader(session.id),
  });

  t.equal(response.status, 200);
  t.equal(body.appliedAmountCents, 1239);
  t.equal(applyStub.callCount, 1);
  t.deepEqual(applyStub.firstCall.args, [user.id, "freeBie"]);
});
