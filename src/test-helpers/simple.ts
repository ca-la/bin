import * as tape from 'tape';

export type Test = tape.Test;

/**
 * Use this test wrapper when your tests do not need to call to the database or
 * network layer. Test will need to provide their own setup and teardown within
 * the body of their test case.
 */
export function test(description: string, testCase: tape.TestCase): void {
  tape(description, (t: tape.Test) => {
    testCase(t);
    t.end();
  });
}
