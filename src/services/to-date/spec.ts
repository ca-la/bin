import { test, Test } from '../../test-helpers/simple';
import toDateOrNull, { toDateStringOrNull } from './index';

test('toDate', (t: Test) => {
  const validDate = new Date();
  const validDateString = validDate.toISOString();
  t.deepEqual(toDateOrNull(validDate), validDate, 'Date returns Date');
  t.deepEqual(toDateOrNull(validDateString), validDate, 'Date string returns Date');
  t.deepEqual(toDateOrNull(null), null, 'null returns null');
  t.deepEqual(toDateOrNull(undefined), null, 'undefined returns null');
  t.throws(() => toDateOrNull('invalid date string'), 'returns invalid date object');
});

test('toDateString', (t: Test) => {
  const validDate = new Date();
  const validDateString = validDate.toISOString();
  t.deepEqual(
    toDateStringOrNull(validDate),
    validDateString,
    'Date returns Date string'
  );
  t.deepEqual(
    toDateStringOrNull(validDateString),
    validDateString,
    'Date string returns Date'
  );
});
