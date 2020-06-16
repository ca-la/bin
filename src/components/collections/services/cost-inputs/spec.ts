import { omit } from "lodash";
import Knex from "knex";

import { sandbox, test, Test } from "../../../../test-helpers/fresh";
import DesignsDAO from "../../../product-designs/dao";
import * as DetermineSubmissionStatus from "../determine-submission-status";
import * as CostInputsDAO from "../../../pricing-cost-inputs/dao";
import DesignEventsDAO from "../../../design-events/dao";
import { commitCostInputs, recostInputs } from ".";
import { generateDesign } from "../../../../test-helpers/factories/product-design";
import db from "../../../../services/db";
import createUser from "../../../../test-helpers/create-user";
import ApprovalStepsDAO from "../../../approval-steps/dao";
import ApprovalStep, { ApprovalStepType } from "../../../approval-steps/types";

test("commitCostInputs commits cost inputs", async (t: Test) => {
  const { user } = await createUser();
  const designOne = await generateDesign({ userId: user.id });
  const designTwo = await generateDesign({ userId: user.id });
  const designThree = await generateDesign({ userId: user.id });

  const findByCollectionStub = sandbox()
    .stub(DesignsDAO, "findByCollectionId")
    .resolves([
      { id: designOne.id },
      { id: designTwo.id },
      { id: designThree.id },
    ]);
  const expireStub = sandbox()
    .stub(CostInputsDAO, "expireCostInputs")
    .resolves();
  const createEventStub = sandbox().stub(DesignEventsDAO, "create").resolves();

  const testDate = new Date("2019-04-20");
  const futureDate = new Date("2019-05-04");
  const clock = sandbox().useFakeTimers(testDate);

  await commitCostInputs("collection-one", "user-one");

  t.equal(findByCollectionStub.callCount, 1);
  t.deepEqual(findByCollectionStub.args[0], ["collection-one"]);

  t.equal(expireStub.callCount, 1);
  t.deepEqual(
    expireStub.args[0][0],
    [designOne.id, designTwo.id, designThree.id],
    "Passes through all the designs in the collection"
  );
  t.deepEqual(
    expireStub.args[0][1],
    futureDate,
    "Uses the time two weeks from now"
  );

  const checkoutStep = await db.transaction(async (trx: Knex.Transaction) => {
    const steps = await ApprovalStepsDAO.findByDesign(trx, designOne.id);
    return steps.find(
      (step: ApprovalStep) => step.type === ApprovalStepType.CHECKOUT
    );
  });

  t.equal(
    createEventStub.firstCall.args[1].type,
    "COMMIT_COST_INPUTS",
    "Creates a COMMIT_COST_INPUTS event"
  );
  t.equal(
    createEventStub.firstCall.args[1].approvalStepId,
    checkoutStep.id,
    "Costing is associated with the right step"
  );
  t.equal(createEventStub.callCount, 3);

  clock.reset();
});

test("recostInputs duplicates and commits inputs", async (t: Test) => {
  const MOCK_COST_INPUTS = [
    {
      createdAt: 2,
      materialBudgetCents: 2000,
    },
    {
      createdAt: 3,
      materialBudgetCents: 5000,
    },
    {
      createdAt: 1,
      materialBudgetCents: 1000,
    },
  ];
  const getDesignsMetaByCollectionStub = sandbox()
    .stub(DetermineSubmissionStatus, "getDesignsMetaByCollection")
    .resolves({
      ["collection-one"]: [
        {
          id: "design-one",
          costInputs: MOCK_COST_INPUTS,
        },
      ],
    });

  const attachProcessesStub = sandbox()
    .stub(CostInputsDAO, "attachProcesses")
    .resolves({
      ...MOCK_COST_INPUTS[1],
      processes: [],
    });
  const createCostInputStub = sandbox()
    .stub(CostInputsDAO, "create")
    .resolves();

  const testDate = new Date("2019-04-20");
  const clock = sandbox().useFakeTimers(testDate);

  await recostInputs("collection-one");

  t.equal(getDesignsMetaByCollectionStub.callCount, 1);
  t.deepEqual(
    getDesignsMetaByCollectionStub.args[0],
    [["collection-one"]],
    "Calls getDesignsMetaByCollection with proper args"
  );

  t.equal(attachProcessesStub.callCount, 1);
  t.deepEqual(
    attachProcessesStub.args[0][0],
    MOCK_COST_INPUTS[1],
    "Calls attachProcesses with proper args"
  );

  t.equal(createCostInputStub.callCount, 1);
  t.deepEqual(
    omit(createCostInputStub.args[0][1], "id"),
    {
      ...MOCK_COST_INPUTS[1],
      processes: [],
      createdAt: testDate,
      deletedAt: null,
      expiresAt: null,
    },
    "Calls createCostInputStub with proper args"
  );

  clock.reset();
});
