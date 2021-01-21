import process from "process";
import Knex from "knex";
import { pick } from "lodash";

import Logger from "../services/logger";
import db from "../services/db";
import { check } from "../services/check";
import ApprovalStepsDAO from "../components/approval-steps/dao";
import ApprovalStep, {
  ApprovalStepState,
  ApprovalStepType,
  approvalStepTypeSchema,
} from "../components/approval-steps/types";
import ResourceNotFoundError from "../errors/resource-not-found";

import "../components/approval-steps/listeners";

const USAGE = `
  set-current-step

  $ bin/run [env] [designId] [ApprovalStepType]
`;

async function setCurrentStep(designId: string, stepType: ApprovalStepType) {
  return db.transaction(async (trx: Knex.Transaction) => {
    const targetStep = await ApprovalStepsDAO.findOne(trx, {
      designId,
      type: stepType,
    });

    if (!targetStep) {
      throw new ResourceNotFoundError(
        `Could not find step for design "${designId}" of type "${stepType}"`
      );
    }

    if (targetStep.state !== ApprovalStepState.COMPLETED) {
      throw new Error(`Target step's state must be completed.

If you are attempting to set a "future" step to be current, please do so in the
Studio UI using the Complete button to have a better record of who did what.
`);
    }

    const designSteps = await ApprovalStepsDAO.findByDesign(
      trx,
      targetStep.designId
    );

    Logger.log(`Design: ${targetStep.designId} Current Steps`);
    Logger.table(
      designSteps.map((designStep: ApprovalStep) =>
        pick(designStep, ["id", "type", "state", "startedAt", "completedAt"])
      )
    );

    const stepsToUpdate = designSteps
      .filter(
        (step: ApprovalStep) =>
          targetStep.ordering <= step.ordering &&
          step.state === ApprovalStepState.COMPLETED
      )
      .sort((a: ApprovalStep, b: ApprovalStep) => b.ordering - a.ordering);

    for (const stepToUpdate of stepsToUpdate) {
      // DAO listener ensures that setting each step current does the right thing
      await ApprovalStepsDAO.update(trx, stepToUpdate.id, {
        state: ApprovalStepState.CURRENT,
      });
    }

    Logger.log("Steps after update");
    Logger.table(
      (
        await ApprovalStepsDAO.findByDesign(trx, targetStep.designId)
      ).map((designStep: ApprovalStep) =>
        pick(designStep, ["id", "type", "state", "startedAt", "completedAt"])
      )
    );
  });
}

function main() {
  const [, , designId, stepType] = process.argv;

  if (!designId) {
    throw new Error(USAGE);
  }

  if (!check(approvalStepTypeSchema, stepType)) {
    throw new Error(USAGE);
  }

  return setCurrentStep(designId, stepType);
}

main()
  .catch((err: string) => {
    Logger.logServerError(err);
    process.exit(1);
  })
  .then(() => {
    Logger.log("Success!");
    process.exit(0);
  });
