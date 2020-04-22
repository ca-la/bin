import Knex from 'knex';
import process from 'process';
import { chunk } from 'lodash';
import meow from 'meow';
import uuid from 'node-uuid';

import { log, logServerError } from '../../services/logger';
import { format, green } from '../../services/colors';
import db from '../../services/db';
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType
} from '../../components/approval-steps/domain-object';
import * as ApprovalStepsDAO from '../../components/approval-steps/dao';
import { queryWithCostsAndEvents } from '../../components/product-designs/dao/dao';
import {
  isProductDesignRowWithMeta,
  ProductDesignDataWithMeta,
  ProductDesignRowWithMeta,
  withMetaDataAdapter
} from '../../components/product-designs/domain-objects/with-meta';
import { validateEvery } from '../../services/validate-from-db';
import {
  DesignState,
  determineState
} from '../../components/product-designs/services/state-machine';

const HELP_TEXT = `
Create steps with correct state from existing designs without steps

Usage
$ bin/run [environment] src/scripts/one-off/2020-04-20-create-steps-for-designs

Options
--dry-run        Only print the query, do not execute
`;

const cli = meow(HELP_TEXT, {
  flags: {
    dryRun: {
      default: false,
      type: 'boolean'
    }
  }
});

const generatorFromCurrentStep: {
  [StepType in ApprovalStepType]: (designId: string) => ApprovalStep[]
} = {
  [ApprovalStepType.CHECKOUT]: (designId: string): ApprovalStep[] => [
    {
      id: uuid.v4(),
      state: ApprovalStepState.CURRENT,
      title: 'Checkout',
      ordering: 0,
      designId,
      reason: null,
      type: ApprovalStepType.CHECKOUT
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.BLOCKED,
      title: 'Technical Design',
      ordering: 1,
      designId,
      reason: 'Pending technical partner pairing',
      type: ApprovalStepType.TECHNICAL_DESIGN
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.BLOCKED,
      title: 'Sample',
      ordering: 2,
      designId,
      reason: 'Pending production partner pairing',
      type: ApprovalStepType.SAMPLE
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Production',
      ordering: 3,
      designId,
      reason: null,
      type: ApprovalStepType.PRODUCTION
    }
  ],
  [ApprovalStepType.TECHNICAL_DESIGN]: (designId: string): ApprovalStep[] => [
    {
      id: uuid.v4(),
      state: ApprovalStepState.COMPLETED,
      title: 'Checkout',
      ordering: 0,
      designId,
      reason: null,
      type: ApprovalStepType.CHECKOUT
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.CURRENT,
      title: 'Technical Design',
      ordering: 1,
      designId,
      reason: null,
      type: ApprovalStepType.TECHNICAL_DESIGN
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.BLOCKED,
      title: 'Sample',
      ordering: 2,
      designId,
      reason: 'Pending production partner pairing',
      type: ApprovalStepType.SAMPLE
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: 'Production',
      ordering: 3,
      designId,
      reason: null,
      type: ApprovalStepType.PRODUCTION
    }
  ],
  [ApprovalStepType.SAMPLE]: (): ApprovalStep[] => [],
  [ApprovalStepType.PRODUCTION]: (): ApprovalStep[] => []
};

async function getDesignsWithCurrentStep(): Promise<
  { id: string; currentStep: ApprovalStepType }[]
> {
  const rows = await queryWithCostsAndEvents()
    .leftJoin(
      'design_approval_steps',
      'design_approval_steps.design_id',
      'd.id'
    )
    .where({ 'design_approval_steps.id': null });

  const designsWithoutSteps = validateEvery<
    ProductDesignRowWithMeta,
    ProductDesignDataWithMeta
  >('product_designs', isProductDesignRowWithMeta, withMetaDataAdapter, rows);

  return designsWithoutSteps.map(
    (
      design: ProductDesignDataWithMeta
    ): { id: string; currentStep: ApprovalStepType } => {
      const state = determineState(design);

      switch (state) {
        case DesignState.INITIAL:
        case DesignState.SUBMITTED:
        case DesignState.COSTED: {
          log(`${design.title || 'Untitled'} -> CHECKOUT`);
          return {
            id: design.id,
            currentStep: ApprovalStepType.CHECKOUT
          };
        }

        case DesignState.CHECKED_OUT:
        case DesignState.PAIRED: {
          log(`${design.title || 'Untitled'} -> TECHNICAL_DESIGN`);
          return {
            id: design.id,
            currentStep: ApprovalStepType.TECHNICAL_DESIGN
          };
        }
      }
    }
  );
}

async function main(): Promise<string> {
  let stepsToInsert: ApprovalStep[] = [];
  const designsWithCurrentStep = await getDesignsWithCurrentStep();
  for (const design of designsWithCurrentStep) {
    const generator = generatorFromCurrentStep[design.currentStep];
    stepsToInsert = stepsToInsert.concat(generator(design.id));
  }

  log(
    `Inserting a total of ${stepsToInsert.length} steps for ${
      designsWithCurrentStep.length
    } designs`
  );

  if (cli.flags.dryRun) {
    return 'Dry run, no rows inserted';
  }

  await db.transaction(async (trx: Knex.Transaction) => {
    for (const c of chunk(stepsToInsert, 1000)) {
      await ApprovalStepsDAO.createAll(trx, c);
    }
  });

  return format(green, 'Success!');
}

main()
  .catch((err: any) => {
    logServerError(err);
    process.exit(1);
  })
  .then((message: string) => {
    log(message);
    process.exit(0);
  });
