'use strict';

const tape = require('tape');
const sinon = require('sinon');

const db = require('../services/db');

const TABLES = [
  'addresses',
  'collectionphotos',
  'designerphotos',
  'designers',
  'productvideos',
  'pushtokens',
  'scanphotos',
  'scans',
  'sessions',
  'unassigned_referral_codes',
  'users'
];

let currentSandbox;

function beforeEach() {
  currentSandbox = sinon.sandbox.create();
}

function afterEach() {
  currentSandbox.restore();

  // Very naive 'wipe the database' query.
  // Should be expanded to reset sequences, be more efficient, &etc.
  const query = TABLES
    .map(table => `truncate table ${table} cascade;`)
    .join('\n');

  return db.raw(query);
}

tape.onFinish(() => {
  db.destroy();
});

// Run a test in a 'fresh' environment; clear DB and any stubs
function freshTest(
  description,
  fn,
  setup = () => {},
  teardown = () => {}
) {
  tape(description, (t) => {
    const end = t.end;

    // Tests should not be able to end themselves early. Using `plan` has the
    // nasty side effect that the rest of the test will continue running even
    // though the test runner moves onto the next test as soon as the plan is
    // hit.
    t.end = null; // eslint-disable-line no-param-reassign
    t.plan = null; // eslint-disable-line no-param-reassign

    beforeEach();

    setup();

    // For now, all tests must return promises. Can reevaluate this, but it
    // provides a nice safety net for async code.
    const result = fn(t);

    if (!result || !result.then) {
      const err = Error(`
        All tests must return promises.

        Try \`const ok = Promise.resolve()\` at the top of your test suite,
        and returning \`ok\` at the end of each synchronous test.
      `);
      t.fail(err);
    }

    result
      .catch((err) => {
        t.fail(err);
        console.log(err.stack); // eslint-disable-line no-console
      })
      .then(teardown)
      .then(afterEach)
      .then(() => end());
  });
}

function skip() { /* noop */ }

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
  sandbox() { return currentSandbox; },
  test: freshTest,
  skip
};
