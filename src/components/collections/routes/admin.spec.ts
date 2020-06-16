import API from "../../../test-helpers/http";
import { sandbox, test, Test } from "../../../test-helpers/fresh";
import createUser from "../../../test-helpers/create-user";
import generateCollection from "../../../test-helpers/factories/collection";
import generatePricingValues from "../../../test-helpers/factories/pricing-values";
import generatePricingCostInput from "../../../test-helpers/factories/pricing-cost-input";
import * as NotificationsService from "../../../services/create-notifications";
import * as IrisService from "../../iris/send-message";
import { moveDesign } from "../../../test-helpers/collections";
import { findByDesignId } from "../../pricing-cost-inputs/dao";

test("POST /collections/:id/recost creates new not expired costings", async (t: Test) => {
  const notificationStub = sandbox()
    .stub(NotificationsService, "immediatelySendFullyCostedCollection")
    .resolves();
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();
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
  await API.post(`/collections/${c1.id}/cost-inputs`, {
    headers: API.authHeader(session.id),
  });
  clock.restore();
  t.equal(notificationStub.callCount, 1, "sends costing notification");
  t.equal(irisStub.args[0][0].resource.type, "COMMIT_COST_INPUTS");
  t.equal(irisStub.args[1][0].resource.type, "COMMIT_COST_INPUTS");
  t.equal(irisStub.args[2][0].type, "collection/status-updated");
  irisStub.resetHistory();

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
  t.equal(notificationStub.callCount, 2, "sends costing notification");
  t.equal(irisStub.args[0][0].resource.type, "COMMIT_COST_INPUTS");
  t.equal(irisStub.args[1][0].resource.type, "COMMIT_COST_INPUTS");
  t.equal(irisStub.args[2][0].type, "collection/status-updated");

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
