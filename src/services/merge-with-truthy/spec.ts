import { test, Test } from '../../test-helpers/simple';
import { mergeWithTruthy } from './index';

test('mergeWithTruthy', async (t: Test) => {
  t.deepEqual(
    mergeWithTruthy({ foo: true, bar: false }, { foo: false, bar: true }),
    { foo: true, bar: true }
  );
});
