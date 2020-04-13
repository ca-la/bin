'use strict';

const tape = require('tape');
const sinon = require('sinon');

const db = require('../services/db');

const TABLES = [
  'addresses',
  'approved_signups',
  'bid_task_types',
  'cohort_users',
  'cohorts',
  'collaborators',
  'design_approval_steps',
  'design_approval_step_comments',
  'design_approval_step_tasks',
  'design_approval_submissions',
  'design_events',
  'invoice_payments',
  'invoices',
  'plans',
  'pricing_care_labels',
  'pricing_constants',
  'pricing_cost_input_processes',
  'pricing_cost_inputs',
  'pricing_inputs',
  'pricing_margins',
  'pricing_process_timelines',
  'pricing_processes',
  'pricing_product_materials',
  'pricing_product_types',
  'pricing_quotes',
  'product_designs',
  'product_type_stages',
  'pushtokens',
  'scanphotos',
  'scans',
  'sessions',
  'stage_templates',
  'storefronts',
  'storefront_users',
  'storefront_integration_tokens',
  'subscriptions',
  'task_events',
  'task_templates',
  'tasks',
  'templates',
  'unassigned_referral_codes',
  'users'
];

let currentSandbox;

function beforeEach() {
  currentSandbox = sinon.createSandbox();
}

function afterEach() {
  currentSandbox.restore();

  // Very naive 'wipe the database' query.
  // Should be expanded to reset sequences, be more efficient, &etc.
  const query = TABLES.map(table => `truncate table ${table} cascade;`).join(
    '\n'
  );

  return db.raw(query);
}

tape.onFinish(() => {
  db.destroy();
});

// Run a test in a 'fresh' environment; clear DB and any stubs
function freshTest(description, fn, setup = () => {}, teardown = () => {}) {
  tape(description, async t => {
    const { end } = t;

    // Tests should not be able to end themselves early. Using `plan` has the
    // nasty side effect that the rest of the test will continue running even
    // though the test runner moves onto the next test as soon as the plan is
    // hit.
    t.end = null; // eslint-disable-line no-param-reassign
    t.plan = null; // eslint-disable-line no-param-reassign

    beforeEach();

    let context = null;

    try {
      context = await setup();
      // For now, all tests must return promises. Can reevaluate this, but it
      // provides a nice safety net for async code.
      const testPromise = fn(t, context);

      if (!testPromise || !testPromise.then) {
        const err = Error(`
        All tests must return promises.

        Try writing your test using async/await; it'll probably be clearer too!
      `);
        t.fail(err);
      }

      await testPromise;
    } catch (err) {
      t.fail(err);
      console.log(err.stack); // eslint-disable-line no-console
    }

    await teardown(context);
    await afterEach();

    end();
  });
}

function skip() {
  /* noop */
}

/**
 * Create a new test block which runs a given setup/teardown for each test
 */
function group(setup, teardown) {
  return (description, fn) => {
    return freshTest(description, fn, setup, teardown);
  };
}

module.exports = {
  group,
  sandbox() {
    return currentSandbox;
  },
  test: freshTest,
  skip
};
