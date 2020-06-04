import uuid from "node-uuid";

import { test, Test, sandbox } from "../../test-helpers/fresh";
import { generateDesign } from "../../test-helpers/factories/product-design";
import generateBid from "../../test-helpers/factories/bid";
import { actualizeDesignStepsAfterBidAcceptance } from "./";
import db from "../../services/db";
import createUser from "../../test-helpers/create-user";

import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "../../components/approval-steps/domain-object";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import { taskTypes } from "../../components/tasks/templates";
import DesignEvent from "../../components/design-events/types";
import DesignEventsDAO from "../../components/design-events/dao";

interface TestCase {
  title: string;
  taskTypeIds: string[];
  isBlank: boolean;
  stepStates: { [key in ApprovalStepType]: ApprovalStepState };
  createdDesignEvents: Partial<DesignEvent>[];
}

const testCases: TestCase[] = [
  {
    title: "Technical Design bid",
    taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.CURRENT,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.BLOCKED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED,
    },
    createdDesignEvents: [
      {
        taskTypeId: taskTypes.TECHNICAL_DESIGN.id,
        type: "STEP_PARTNER_PAIRING",
      },
    ],
  },
  {
    title: "Production bid",
    taskTypeIds: [taskTypes.PRODUCTION.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.BLOCKED,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.UNSTARTED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED,
    },
    createdDesignEvents: [
      {
        taskTypeId: taskTypes.PRODUCTION.id,
        type: "STEP_PARTNER_PAIRING",
      },
    ],
  },
  {
    title: "Bid with Production and Technical Design tasks",
    taskTypeIds: [taskTypes.PRODUCTION.id, taskTypes.TECHNICAL_DESIGN.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.CURRENT,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.UNSTARTED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED,
    },
    createdDesignEvents: [
      {
        taskTypeId: taskTypes.PRODUCTION.id,
        type: "STEP_PARTNER_PAIRING",
      },
      {
        taskTypeId: taskTypes.TECHNICAL_DESIGN.id,
        type: "STEP_PARTNER_PAIRING",
      },
    ],
  },
];

for (const testCase of testCases) {
  test(testCase.title, async (t: Test) => {
    const { user } = await createUser({ withSession: false });
    const design = await generateDesign({
      userId: user.id,
    });
    const { bid } = await generateBid({
      bidOptions: {
        taskTypeIds: testCase.taskTypeIds,
      },
      designId: design.id,
    });
    const createDesignEventStub = sandbox().stub(DesignEventsDAO, "create");

    const trx = await db.transaction();
    try {
      // Completing checkout step
      // since bid acceptance can take place only after checkout
      const checkoutStep = await ApprovalStepsDAO.findOne(trx, {
        designId: design.id,
        type: ApprovalStepType.CHECKOUT,
      });
      await ApprovalStepsDAO.update(trx, checkoutStep!.id, {
        completedAt: new Date(),
        reason: null,
        state: ApprovalStepState.COMPLETED,
      });

      const event: DesignEvent = {
        actorId: user.id,
        approvalSubmissionId: null,
        bidId: bid.id,
        commentId: null,
        createdAt: new Date(),
        designId: design.id,
        id: uuid.v4(),
        quoteId: null,
        targetId: null,
        type: "STEP_PARTNER_PAIRING",
        taskTypeId: null,
        approvalStepId: null,
      };

      await actualizeDesignStepsAfterBidAcceptance(trx, event);
      const approvalSteps: ApprovalStep[] = await ApprovalStepsDAO.findByDesign(
        trx,
        design.id
      );
      for (const approvalStep of approvalSteps) {
        t.is(
          approvalStep.state,
          testCase.stepStates[approvalStep.type],
          `${approvalStep.type} should be ${
            testCase.stepStates[approvalStep.type]
          }`
        );
      }
      const createdEvents = createDesignEventStub.args.reduce(
        (acc: Partial<DesignEvent>[], arg: any) => {
          acc.push({
            taskTypeId: arg[1].taskTypeId,
            type: arg[1].type,
          });
          return acc;
        },
        []
      );
      t.deepEqual(
        createdEvents,
        testCase.createdDesignEvents,
        `${testCase.title}: creates design events`
      );
    } finally {
      await trx.rollback();
      createDesignEventStub.restore();
    }
  });
}
