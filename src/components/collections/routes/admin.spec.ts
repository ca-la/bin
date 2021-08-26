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
import { submitCollection } from "../../../test-helpers/submit-collection";

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

test("POST /:collectionId/reject", async (t: Test) => {
  const {
    collection,
    collectionDesigns,
    user: { designer, admin },
  } = await submitCollection();
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();

  const notificationStub = sandbox()
    .stub(NotificationsService, "immediatelySendRejectCollection")
    .resolves();

  const [forbidden] = await API.post(`/collections/${collection.id}/reject`, {
    headers: API.authHeader(designer.session.id),
  });

  t.equal(forbidden.status, 403, "Requires ADMIN role");

  const [, beforeRejectStatus] = await API.get(
    `/collections/${collection.id}/submissions`,
    {
      headers: API.authHeader(designer.session.id),
    }
  );

  t.deepEqual(
    beforeRejectStatus,
    {
      collectionId: collection.id,
      isSubmitted: true,
      isCosted: false,
      isQuoted: false,
      isPaired: false,
      pricingExpiresAt: null,
    },
    "Returns the costed collection submission status"
  );

  const [response, body] = await API.post(
    `/collections/${collection.id}/reject`,
    {
      headers: API.authHeader(admin.session.id),
    }
  );

  t.equal(response.status, 200, "Returns OK response");
  t.deepEqual(
    [
      {
        ...body[0],
        type: "REJECT_DESIGN",
        designId: collectionDesigns[0].id,
      },
      {
        ...body[1],
        type: "REJECT_DESIGN",
        designId: collectionDesigns[1].id,
      },
    ],
    body,
    "returns the reject events for the correct designs"
  );

  const [, collectionWithStatus] = await API.get(
    `/collections/${collection.id}/submissions`,
    {
      headers: API.authHeader(designer.session.id),
    }
  );

  t.deepEqual(
    collectionWithStatus,
    {
      collectionId: collection.id,
      isSubmitted: false,
      isCosted: false,
      isQuoted: false,
      isPaired: false,
      pricingExpiresAt: null,
    },
    "Returns the correct collection submission status"
  );

  t.deepEqual(
    irisStub.args,
    [
      [
        {
          ...irisStub.args[0][0],
          type: "design-event/created",
        },
      ],
      [
        {
          ...irisStub.args[1][0],
          type: "design-event/created",
        },
      ],
      [
        {
          type: "collection/status-updated",
          collectionId: collection.id,
          resource: {
            collectionId: collection.id,
            isSubmitted: false,
            isCosted: false,
            isQuoted: false,
            isPaired: false,
            pricingExpiresAt: null,
          },
        },
      ],
    ],
    "sends design events and new status in realtime"
  );

  t.deepEqual(
    notificationStub.args,
    [[collection.id, admin.user.id]],
    "sends rejection notification"
  );
});
