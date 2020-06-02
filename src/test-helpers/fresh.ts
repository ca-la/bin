import Knex from "knex";
import tape, { Test } from "tape";
export { Test } from "tape";
import sinon from "sinon";
import AWS from "aws-sdk";

import db from "../services/db";

const TABLES = [
  "addresses",
  "approved_signups",
  "bid_task_types",
  "cohort_users",
  "cohorts",
  "collaborators",
  "design_approval_steps",
  "design_approval_step_comments",
  "design_approval_step_tasks",
  "design_approval_submissions",
  "design_events",
  "invoice_payments",
  "invoices",
  "plans",
  "pricing_care_labels",
  "pricing_constants",
  "pricing_cost_input_processes",
  "pricing_cost_inputs",
  "pricing_inputs",
  "pricing_margins",
  "pricing_process_timelines",
  "pricing_processes",
  "pricing_product_materials",
  "pricing_product_types",
  "pricing_quotes",
  "product_designs",
  "product_type_stages",
  "pushtokens",
  "scanphotos",
  "scans",
  "sessions",
  "stage_templates",
  "storefronts",
  "storefront_users",
  "storefront_integration_tokens",
  "subscriptions",
  "task_events",
  "task_templates",
  "tasks",
  "templates",
  "unassigned_referral_codes",
  "users",
];

let currentSandbox: sinon.SinonSandbox;

function beforeEach(): void {
  currentSandbox = sinon.createSandbox();
  currentSandbox.stub(AWS, "SQS").returns({
    sendMessage: currentSandbox.stub().returns({
      promise: (): Promise<void> => Promise.resolve(),
    }),
  });
}

function afterEach(): Knex.QueryBuilder {
  currentSandbox.restore();

  // Very naive 'wipe the database' query.
  // Should be expanded to reset sequences, be more efficient, &etc.
  const query = TABLES.map(
    (table: string): string => `truncate table ${table} cascade;`
  ).join("\n");

  return db.raw(query);
}

tape.onFinish(() => {
  db.destroy();
});

// Run a test in a 'fresh' environment; clear DB and any stubs
export function test(
  description: string,
  fn: (t: Test, context: any | null) => Promise<any>,
  setup: () => Promise<unknown> = async (): Promise<void> => {
    return;
  },
  teardown: (context: any | null) => Promise<unknown> = async (): Promise<
    void
  > => {
    return;
  }
): void {
  tape(description, async (t: Test) => {
    const { end } = t;

    // Tests should not be able to end themselves early. Using `plan` has the
    // nasty side effect that the rest of the test will continue running even
    // though the test runner moves onto the next test as soon as the plan is
    // hit.
    t.end = (): void => {
      throw new Error("t.end not supported");
    };
    t.plan = (): void => {
      throw new Error("t.plan no supported");
    };

    beforeEach();

    let context: any | null = null;

    try {
      context = await setup();
      // For now, all tests must return promises. Can reevaluate this, but it
      // provides a nice safety net for async code.
      const testPromise = fn(t, context);

      if (!testPromise || !testPromise.then) {
        t.fail(`
All tests must return promises.

Try writing your test using async/await; it'll probably be clearer too!
`);
      }

      await testPromise;
    } catch (err) {
      t.fail(err);
      console.log(err.stack); // tslint:disable-line no-console
    }

    await teardown(context);
    await afterEach();

    end();
  });
}

export function skip(): void {
  return;
}

/**
 * Create a new test block which runs a given setup/teardown for each test
 */
export function group(
  setup: () => Promise<unknown> = async (): Promise<void> => {
    return;
  },
  teardown: (context: any | null) => Promise<unknown> = async (): Promise<
    void
  > => {
    return;
  }
): (
  description: string,
  fn: (t: Test, context: any | null) => Promise<any>
) => void {
  return (
    description: string,
    fn: (t: Test, context: any | null) => Promise<any>
  ): void => {
    return test(description, fn, setup, teardown);
  };
}

export function sandbox(): sinon.SinonSandbox {
  return currentSandbox;
}

export default {
  group,
  sandbox,
  test,
  skip,
};
