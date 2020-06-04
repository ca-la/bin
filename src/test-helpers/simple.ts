import tape from "tape";
import sinon from "sinon";

export type Test = tape.Test;

let currentSandbox: sinon.SinonSandbox;

function beforeEach(): void {
  currentSandbox = sinon.createSandbox();
}

function afterEach(): void {
  currentSandbox.restore();
}

/**
 * Use this test wrapper when your tests do not need to call to the database or
 * network layer. Test will need to provide their own setup and teardown within
 * the body of their test case.
 */
export function test(
  description: string,
  testCase: (t: tape.Test) => Promise<void> | void
): void {
  tape(description, async (t: tape.Test) => {
    beforeEach();

    try {
      await testCase(t);
    } catch (err) {
      t.fail(err);
    }

    afterEach();
    t.end();
  });
}

export function sandbox(): sinon.SinonSandbox {
  return currentSandbox;
}
