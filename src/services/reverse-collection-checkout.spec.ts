import Knex from "knex";
import uuid from "node-uuid";

import { reverseCollectionCheckout } from "./reverse-collection-checkout";
import { sandbox, test, Test, db } from "../test-helpers/fresh";
import { costCollection } from "../test-helpers/cost-collection";
import createUser from "../test-helpers/create-user";
import { checkout } from "../test-helpers/checkout-collection";
import { determineSubmissionStatus } from "../components/collections/services/determine-submission-status";
import ApprovalStepsDAO from "../components/approval-steps/dao";
import { ApprovalStepState, ApprovalStepType } from "../published-types";
import * as IrisService from "../components/iris/send-message";

test("reverseCollectionCheckout: collection does not exist", async (t: Test) => {
  const { user } = await createUser({ withSession: false });
  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await reverseCollectionCheckout(trx, uuid.v4(), user.id);
      t.fail("should not succeed");
    } catch (err) {
      t.ok(err, "throws an error if collection does not exist");
    }
  });
});

test("reverseCollectionCheckout: collection not checked out", async (t: Test) => {
  const {
    collection,
    user: { admin },
  } = await costCollection();
  await db.transaction(async (trx: Knex.Transaction) => {
    try {
      await reverseCollectionCheckout(trx, collection.id, admin.user.id);
      t.fail("should not succeed");
    } catch (err) {
      t.ok(err, "throws an error if collection is not checked out");
    }
  });
});

test("reverseCollectionCheckout: collection is already reversed", async (t: Test) => {
  const {
    collection,
    user: { admin },
  } = await checkout();

  await db.transaction(async (trx: Knex.Transaction) => {
    await reverseCollectionCheckout(trx, collection.id, admin.user.id);

    try {
      await reverseCollectionCheckout(trx, collection.id, admin.user.id);
      t.fail("should not succeed a second time");
    } catch (err) {
      t.ok(err, "throws an error on the second attempt to reverse");
    }
  });
});

test("reverseCollectionCheckout", async (t: Test) => {
  const {
    collection,
    collectionDesigns,
    user: { admin },
  } = await checkout();
  const irisStub = sandbox().stub(IrisService, "sendMessage").resolves();

  const statusBefore = (await determineSubmissionStatus([collection.id]))[
    collection.id
  ];

  t.true(
    statusBefore.isQuoted,
    "before reversal, collection shows as checked out"
  );

  await db.transaction((trx: Knex.Transaction) =>
    reverseCollectionCheckout(trx, collection.id, admin.user.id)
  );

  const statusAfter = (await determineSubmissionStatus([collection.id]))[
    collection.id
  ];

  t.false(
    statusAfter.isQuoted,
    "after reversal, collection is not checked out"
  );

  t.deepEqual(
    await ApprovalStepsDAO.findByDesign(
      db,
      collectionDesigns[0].id
    ).then((steps) => steps.map(({ type, state }) => ({ type, state }))),
    [
      { type: ApprovalStepType.CHECKOUT, state: ApprovalStepState.CURRENT },
      {
        type: ApprovalStepType.TECHNICAL_DESIGN,
        state: ApprovalStepState.BLOCKED,
      },
      { type: ApprovalStepType.SAMPLE, state: ApprovalStepState.BLOCKED },
      { type: ApprovalStepType.PRODUCTION, state: ApprovalStepState.UNSTARTED },
    ],
    "design 1: current step is checkout"
  );
  t.deepEqual(
    await ApprovalStepsDAO.findByDesign(
      db,
      collectionDesigns[1].id
    ).then((steps) => steps.map(({ type, state }) => ({ type, state }))),
    [
      { type: ApprovalStepType.CHECKOUT, state: ApprovalStepState.CURRENT },
      {
        type: ApprovalStepType.TECHNICAL_DESIGN,
        state: ApprovalStepState.BLOCKED,
      },
      { type: ApprovalStepType.SAMPLE, state: ApprovalStepState.BLOCKED },
      { type: ApprovalStepType.PRODUCTION, state: ApprovalStepState.UNSTARTED },
    ],
    "design 2: current step is checkout"
  );

  t.deepEqual(
    irisStub.args.slice(-1),
    [
      [
        {
          channels: [`collections/${collection.id}`],
          resource: statusAfter,
          type: "collection/status-updated",
        },
      ],
    ],
    "creates a realtime message with new status"
  );
});
