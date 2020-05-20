import Knex from "knex";
import process from "process";
import { chunk } from "lodash";
import meow from "meow";
import uuid from "node-uuid";

import { log, logServerError } from "../../services/logger";
import { format, green } from "../../services/colors";
import db from "../../services/db";
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
} from "../../components/approval-steps/domain-object";
import * as ApprovalStepsDAO from "../../components/approval-steps/dao";
import { queryWithCostsAndEvents } from "../../components/product-designs/dao/dao";
import {
  DesignState,
  determineState,
} from "../../components/product-designs/services/state-machine";
import DesignEvent, {
  DesignEventRow,
  dataAdapter as eventDataAdapter,
} from "../../domain-objects/design-event";
import {
  BasePricingCostInputRow,
  baseDataAdapter as costInputDataAdapter,
  BasePricingCostInput,
} from "../../components/pricing-cost-inputs/domain-object";
import {
  dataAdapter as baseDataAdapter,
  ProductDesignRow,
  ProductDesignData,
} from "../../components/product-designs/domain-objects/product-designs-new";

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
      type: "boolean",
    },
  },
});

const generatorFromCurrentStep: {
  [StepType in ApprovalStepType]: (designId: string) => ApprovalStep[];
} = {
  [ApprovalStepType.CHECKOUT]: (designId: string): ApprovalStep[] => [
    {
      id: uuid.v4(),
      state: ApprovalStepState.CURRENT,
      title: "Checkout",
      ordering: 0,
      designId,
      reason: null,
      type: ApprovalStepType.CHECKOUT,
      collaboratorId: null,
      completedAt: null,
      createdAt: new Date(),
      startedAt: new Date(),
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.BLOCKED,
      title: "Technical Design",
      ordering: 1,
      designId,
      reason: "Pending partner pairing",
      type: ApprovalStepType.TECHNICAL_DESIGN,
      collaboratorId: null,
      completedAt: null,
      createdAt: new Date(),
      startedAt: null,
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.BLOCKED,
      title: "Sample",
      ordering: 2,
      designId,
      reason: "Pending partner pairing",
      type: ApprovalStepType.SAMPLE,
      collaboratorId: null,
      completedAt: null,
      createdAt: new Date(),
      startedAt: null,
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: "Production",
      ordering: 3,
      designId,
      reason: null,
      type: ApprovalStepType.PRODUCTION,
      collaboratorId: null,
      completedAt: null,
      createdAt: new Date(),
      startedAt: null,
    },
  ],
  [ApprovalStepType.TECHNICAL_DESIGN]: (designId: string): ApprovalStep[] => [
    {
      id: uuid.v4(),
      state: ApprovalStepState.COMPLETED,
      title: "Checkout",
      ordering: 0,
      designId,
      reason: null,
      type: ApprovalStepType.CHECKOUT,
      collaboratorId: null,
      completedAt: new Date(),
      createdAt: new Date(),
      startedAt: new Date(),
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.CURRENT,
      title: "Technical Design",
      ordering: 1,
      designId,
      reason: null,
      type: ApprovalStepType.TECHNICAL_DESIGN,
      collaboratorId: null,
      completedAt: null,
      createdAt: new Date(),
      startedAt: new Date(),
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.BLOCKED,
      title: "Sample",
      ordering: 2,
      designId,
      reason: "Pending partner pairing",
      type: ApprovalStepType.SAMPLE,
      collaboratorId: null,
      completedAt: null,
      createdAt: new Date(),
      startedAt: null,
    },
    {
      id: uuid.v4(),
      state: ApprovalStepState.UNSTARTED,
      title: "Production",
      ordering: 3,
      designId,
      reason: null,
      type: ApprovalStepType.PRODUCTION,
      collaboratorId: null,
      completedAt: null,
      createdAt: new Date(),
      startedAt: null,
    },
  ],
  [ApprovalStepType.SAMPLE]: (): ApprovalStep[] => [],
  [ApprovalStepType.PRODUCTION]: (): ApprovalStep[] => [],
};

interface DesignWithInputsAndEvents extends ProductDesignData {
  costInputs: BasePricingCostInput[];
  events: DesignEvent[];
}

async function getDesignsWithCurrentStep(): Promise<
  { id: string; currentStep: ApprovalStepType }[]
> {
  const rows = await queryWithCostsAndEvents()
    .leftJoin(
      "design_approval_steps",
      "design_approval_steps.design_id",
      "d.id"
    )
    .where({ "design_approval_steps.id": null });

  const designsWithoutSteps: DesignWithInputsAndEvents[] = rows.map(
    (
      row: ProductDesignRow & {
        cost_inputs: BasePricingCostInputRow[] | null;
        events: DesignEventRow[] | null;
      }
    ) => {
      const { cost_inputs, events: eventRows, ...baseRow } = row;
      const events =
        eventRows === null
          ? []
          : eventRows.map((eventRow: DesignEventRow) =>
              eventDataAdapter.parse(eventRow)
            );
      const costInputs =
        cost_inputs === null
          ? []
          : cost_inputs.map((costInputRow: BasePricingCostInputRow) =>
              costInputDataAdapter.parse(costInputRow)
            );

      return {
        ...baseDataAdapter.parse(baseRow),
        costInputs,
        events,
      };
    }
  );

  return designsWithoutSteps.map((design: DesignWithInputsAndEvents): {
    id: string;
    currentStep: ApprovalStepType;
  } => {
    const state = determineState(design);

    switch (state) {
      case DesignState.INITIAL:
      case DesignState.SUBMITTED:
      case DesignState.COSTED: {
        log(`${design.title || "Untitled"} -> CHECKOUT`);
        return {
          id: design.id,
          currentStep: ApprovalStepType.CHECKOUT,
        };
      }

      case DesignState.CHECKED_OUT:
      case DesignState.PAIRED: {
        log(`${design.title || "Untitled"} -> TECHNICAL_DESIGN`);
        return {
          id: design.id,
          currentStep: ApprovalStepType.TECHNICAL_DESIGN,
        };
      }
    }
  });
}

async function main(): Promise<string> {
  let stepsToInsert: ApprovalStep[] = [];
  const designsWithCurrentStep = await getDesignsWithCurrentStep();
  for (const design of designsWithCurrentStep) {
    const generator = generatorFromCurrentStep[design.currentStep];
    stepsToInsert = stepsToInsert.concat(generator(design.id));
  }

  log(
    `Inserting a total of ${stepsToInsert.length} steps for ${designsWithCurrentStep.length} designs`
  );

  if (cli.flags.dryRun) {
    return "Dry run, no rows inserted";
  }

  await db.transaction(async (trx: Knex.Transaction) => {
    for (const c of chunk(stepsToInsert, 1000)) {
      await ApprovalStepsDAO.createAll(trx, c);
    }
  });

  return format(green, "Success!");
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
