import tape from "tape";

export type Test = tape.Test;

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
    await testCase(t);
    t.end();
  });
}
