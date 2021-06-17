import { sandbox, test, Test } from "../../test-helpers/fresh";
import db from "../../services/db";
import { ApprovalStepType } from "./types";
import * as dao from "./dao";
import { setApprovalStepsDueAtByPricingQuote } from "./service";
import { PricingQuote } from "../../domain-objects/pricing-quote";

const describeSetApprovalStepsDueAtByPricingQuote = (): void => {
  const now = new Date(0);
  const quote: PricingQuote = {
    designId: "d1",
    specificationTimeMs: 1,
    sourcingTimeMs: 2,
    samplingTimeMs: 3,
    preProductionTimeMs: 4,
    productionTimeMs: 5,
    fulfillmentTimeMs: 6,
  } as PricingQuote;
  const steps = [
    { id: "s1", type: ApprovalStepType.CHECKOUT },
    { id: "s2", type: ApprovalStepType.TECHNICAL_DESIGN },
    { id: "s3", type: ApprovalStepType.SAMPLE },
    { id: "s4", type: ApprovalStepType.PRODUCTION },
  ];
  interface TestCase {
    title: string;
    quotePatch?: Partial<PricingQuote>;
    stepsPatcher?: (originalSteps: any[]) => any[];
    findStubCalls: any[][];
    updateStubCalls: any[][];
  }
  const testCases: TestCase[] = [
    {
      title: "regular case",
      findStubCalls: [[{ designId: "d1" }]],
      updateStubCalls: [
        ["s1", { dueAt: new Date(0) }, { shouldEmitDaoUpdatedEvent: false }],
        ["s2", { dueAt: new Date(1) }, { shouldEmitDaoUpdatedEvent: false }],
        [
          "s3",
          { dueAt: new Date(1 + 2 + 3) },
          { shouldEmitDaoUpdatedEvent: false },
        ],
        [
          "s4",
          { dueAt: new Date(1 + 2 + 3 + 4 + 5 + 6) },
          { shouldEmitDaoUpdatedEvent: false },
        ],
      ],
    },
    {
      title: "no designId in quote",
      quotePatch: { designId: null },
      findStubCalls: [],
      updateStubCalls: [],
    },
    {
      title: "nullish estimations",
      quotePatch: { samplingTimeMs: null, productionTimeMs: null },
      findStubCalls: [[{ designId: "d1" }]],
      updateStubCalls: [
        ["s1", { dueAt: new Date(0) }, { shouldEmitDaoUpdatedEvent: false }],
        ["s2", { dueAt: new Date(1) }, { shouldEmitDaoUpdatedEvent: false }],
        [
          "s3",
          { dueAt: new Date(1 + 2) },
          { shouldEmitDaoUpdatedEvent: false },
        ],
        [
          "s4",
          { dueAt: new Date(1 + 2 + 4 + 6) },
          { shouldEmitDaoUpdatedEvent: false },
        ],
      ],
    },
    {
      title: "all nulls",
      quotePatch: {
        specificationTimeMs: null,
        sourcingTimeMs: null,
        samplingTimeMs: null,
        preProductionTimeMs: null,
        productionTimeMs: null,
        fulfillmentTimeMs: null,
      },
      findStubCalls: [[{ designId: "d1" }]],
      updateStubCalls: [
        ["s1", { dueAt: new Date(0) }, { shouldEmitDaoUpdatedEvent: false }],
        ["s2", { dueAt: new Date(0) }, { shouldEmitDaoUpdatedEvent: false }],
        ["s3", { dueAt: new Date(0) }, { shouldEmitDaoUpdatedEvent: false }],
        ["s4", { dueAt: new Date(0) }, { shouldEmitDaoUpdatedEvent: false }],
      ],
    },
    {
      title: "regular case with non-existing step type",
      stepsPatcher: (originalSteps: any[]): any[] => {
        return [...originalSteps, { type: "NON_EXISTING_STEP_TYPE" }];
      },
      findStubCalls: [[{ designId: "d1" }]],
      updateStubCalls: [
        ["s1", { dueAt: new Date(0) }, { shouldEmitDaoUpdatedEvent: false }],
        ["s2", { dueAt: new Date(1) }, { shouldEmitDaoUpdatedEvent: false }],
        [
          "s3",
          { dueAt: new Date(1 + 2 + 3) },
          { shouldEmitDaoUpdatedEvent: false },
        ],
        [
          "s4",
          { dueAt: new Date(1 + 2 + 3 + 4 + 5 + 6) },
          { shouldEmitDaoUpdatedEvent: false },
        ],
      ],
    },
  ];
  for (const testCase of testCases) {
    test(testCase.title, async (t: Test) => {
      sandbox().useFakeTimers(now);
      const findStub = sandbox().stub(dao, "find");
      const updateStub = sandbox().stub(dao, "update");

      const trx = await db.transaction();
      try {
        findStub.returns(
          testCase.stepsPatcher ? testCase.stepsPatcher(steps) : steps
        );
        await setApprovalStepsDueAtByPricingQuote(
          trx,
          testCase.quotePatch ? { ...quote, ...testCase.quotePatch } : quote
        );
        t.deepEqual(
          findStub.args,
          testCase.findStubCalls.map((stubCall: any[]) => [trx, ...stubCall]),
          `setApprovalStepsDueAtByPricingQuote [${testCase.title}] properly calls ApprovalStepsDAO.find()`
        );
        t.deepEqual(
          updateStub.args,
          testCase.updateStubCalls.map((stubCall: any[]) => [trx, ...stubCall]),
          `setApprovalStepsDueAtByPricingQuote [${testCase.title}] properly calls ApprovalStepsDAO.update()`
        );
        findStub.resetHistory();
        updateStub.resetHistory();
      } finally {
        await trx.rollback();
      }
    });
  }
};
describeSetApprovalStepsDueAtByPricingQuote();
