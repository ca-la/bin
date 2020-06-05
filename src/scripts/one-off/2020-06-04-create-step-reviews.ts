import Knex from "knex";
import process from "process";
import meow from "meow";

import { log, logServerError } from "../../services/logger";
import { format, green, yellow } from "../../services/colors";
import db from "../../services/db";
import { createSubmissionsByProductType } from "../../services/approval-step-state";

import adapter from "../../components/approval-steps/adapter";
import ApprovalStep, {
  ApprovalStepRow,
} from "../../components/approval-steps/types";

const HELP_TEXT = `
Unblocks steps if they have been paired with a partner

Usage
$ bin/run [environment] src/scripts/one-off/2020-06-04-create-step-reviews.ts [--dry-run]
`;

const cli = meow(HELP_TEXT, {
  flags: {
    dryRun: {
      default: false,
      type: "boolean",
    },
  },
});

async function getCheckoutSteps(
  trx: Knex.Transaction
): Promise<ApprovalStep[]> {
  const results = await trx.raw(`
      SELECT
      *
    FROM
      design_approval_steps
    WHERE
      design_id NOT IN (
        SELECT
           design_approval_steps.design_id
         FROM
           design_approval_steps
           JOIN design_approval_submissions ON design_approval_submissions.step_id = design_approval_steps.id
         WHERE
           design_approval_submissions.artifact_type not in ('TECHNICAL_DESIGN','SAMPLE')
         GROUP BY
           design_approval_steps.design_id
      )
      AND TYPE = 'CHECKOUT'
      AND state = 'COMPLETED';
  `);

  return results.rows.map((stepRow: ApprovalStepRow) =>
    adapter.dataAdapter.parse(stepRow)
  );
}

async function main(): Promise<string> {
  const isDryRun = cli.flags.dryRun;

  const submissionCountBefore = await db.raw(
    `select count(*) from design_approval_submissions`
  );
  let reviewCount = submissionCountBefore.rows[0].count;
  let designCount = 0;

  const trx = await db.transaction();
  try {
    const checkoutSteps = await getCheckoutSteps(trx);
    designCount = checkoutSteps.length;
    for (const step of checkoutSteps) {
      await createSubmissionsByProductType(trx, step);
    }
    const submissionCountAfter = await trx.raw(
      `select count(*) from design_approval_submissions`
    );
    reviewCount = submissionCountAfter.rows[0].count - reviewCount;
  } catch (err) {
    await trx.rollback();
    throw err;
  }

  log(format(green, `Added ${reviewCount} reviews to ${designCount} designs`));
  if (isDryRun) {
    await trx.rollback();
    return format(yellow, "Transaction rolled back.");
  }

  await trx.commit();
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
