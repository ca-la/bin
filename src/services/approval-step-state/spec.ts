import { test, Test } from '../../test-helpers/fresh';
import { generateDesign } from '../../test-helpers/factories/product-design';
import generateBid from '../../test-helpers/factories/bid';
import { actualizeDesignStepsAfterBidAcceptance } from './';
import db from '../../services/db';
import createUser from '../../test-helpers/create-user';

import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType
} from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import { taskTypes } from '../../components/tasks/templates';

interface TestCase {
  title: string;
  taskTypeIds: string[];
  isBlank: boolean;
  stepStates: { [key in ApprovalStepType]: ApprovalStepState };
}

const testCases: TestCase[] = [
  {
    title: 'Technical Design bid',
    taskTypeIds: [taskTypes.TECHNICAL_DESIGN.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.CURRENT,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.BLOCKED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED
    }
  },
  {
    title: 'Production bid',
    taskTypeIds: [taskTypes.PRODUCTION.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.BLOCKED,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.UNSTARTED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED
    }
  },
  {
    title: 'Bid with Production and Technical Design tasks',
    taskTypeIds: [taskTypes.PRODUCTION.id, taskTypes.TECHNICAL_DESIGN.id],
    isBlank: false,
    stepStates: {
      [ApprovalStepType.CHECKOUT]: ApprovalStepState.COMPLETED,
      [ApprovalStepType.TECHNICAL_DESIGN]: ApprovalStepState.CURRENT,
      [ApprovalStepType.SAMPLE]: ApprovalStepState.UNSTARTED,
      [ApprovalStepType.PRODUCTION]: ApprovalStepState.UNSTARTED
    }
  }
];

for (const testCase of testCases) {
  test(testCase.title, async (t: Test) => {
    const { user } = await createUser({ withSession: false });
    const design = await generateDesign({
      userId: user.id
    });
    const { bid } = await generateBid({
      bidOptions: {
        taskTypeIds: testCase.taskTypeIds
      },
      designId: design.id
    });
    const trx = await db.transaction();

    // Completing checkout step
    // since bid acceptance can take place only after checkout
    const checkoutStep = await ApprovalStepsDAO.findOne(trx, {
      designId: design.id,
      type: ApprovalStepType.CHECKOUT
    });
    await ApprovalStepsDAO.update(trx, checkoutStep!.id, {
      reason: null,
      state: ApprovalStepState.COMPLETED
    });

    await actualizeDesignStepsAfterBidAcceptance(trx, bid.id, design.id);
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
    await trx.rollback();
  });
}
