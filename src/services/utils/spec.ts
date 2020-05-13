import { getObjectDiff } from '.';
import { test, Test } from '../../test-helpers/simple';

test('getObjectDiff', async (t: Test) => {
  interface Arg {
    p1: string;
    p2?: string | null;
  }
  interface TestCase {
    title: string;
    a1: Arg;
    a2: Arg;
    result: (keyof Arg)[];
  }

  const testCases: TestCase[] = [
    {
      title: 'Equal',
      a1: { p1: 'a', p2: 'b' },
      a2: { p1: 'a', p2: 'b' },
      result: []
    },
    {
      title: 'Different',
      a1: { p1: 'a_', p2: 'b' },
      a2: { p1: 'a', p2: 'b' },
      result: ['p1']
    },
    {
      title: 'Different with null <> undefined',
      a1: { p1: 'a', p2: null },
      a2: { p1: 'a' },
      result: ['p2']
    },
    {
      title: 'Completely different',
      a1: { p1: 'a', p2: null },
      a2: { p1: 'a_', p2: 'b' },
      result: ['p1', 'p2']
    }
  ];

  for (const testCase of testCases) {
    t.deepEqual(
      getObjectDiff(testCase.a1, testCase.a2),
      testCase.result,
      testCase.title
    );
  }
});
