import API from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser = require("../../../test-helpers/create-user");
import generateCollection from "../../../test-helpers/factories/collection";
import generatePricingValues from "../../../test-helpers/factories/pricing-values";
import generatePricingCostInput from "../../../test-helpers/factories/pricing-cost-input";
import { commitCostInputs } from "../services/cost-inputs";
import { moveDesign } from "../../../test-helpers/collections";
import { findByDesignId } from "../../pricing-cost-inputs/dao";

test("POST /collections/:id/recost creates new not expired costings", async (t: Test) => {
  const { user, session } = await createUser({ role: "ADMIN" });
  const { collection: c1 } = await generateCollection({ createdBy: user.id });

  await generatePricingValues();
  const { design: d1 } = await generatePricingCostInput(
    {
      expiresAt: null,
    },
    user.id
  );
  const { design: d2 } = await generatePricingCostInput(
    {
      expiresAt: null,
    },
    user.id
  );

  const designs = [d1, d2];

  for (const d of designs) {
    await moveDesign(c1.id, d.id);
  }
  const moreThanTwoWeeksBeforeNow = new Date();
  moreThanTwoWeeksBeforeNow.setDate(
    moreThanTwoWeeksBeforeNow.getDate() - 14 - 1
  );

  const clock = sandbox().useFakeTimers(moreThanTwoWeeksBeforeNow);
  await commitCostInputs(c1.id, user.id);
  clock.restore();
  for (const d of designs) {
    t.equal(
      (await findByDesignId({ designId: d.id, showExpired: false })).length,
      0,
      "doesn't find costing after expiration"
    );
    t.equal(
      (await findByDesignId({ designId: d.id, showExpired: true })).length,
      1,
      "finds costing after expiration with showExpired: true"
    );
  }

  const [response] = await API.post(`/collections/${c1.id}/recost`, {
    headers: API.authHeader(session.id),
  });
  t.equal(response.status, 204, "Successfully recosts");

  for (const d of designs) {
    t.equal(
      (await findByDesignId({ designId: d.id, showExpired: false })).length,
      1,
      "finds only 1 actual item after recosting"
    );
    t.equal(
      (await findByDesignId({ designId: d.id, showExpired: true })).length,
      2,
      "finds 2 items after recosting with showExpired: true"
    );
  }
});
