import { daysToMinutes, daysToMs } from '.';
import { Test, test } from '../../test-helpers/simple';

test('correctly converts 3 days to minutes', (t: Test) => {
  const minutes = daysToMinutes(3);
  const expected = 3 * 24 * 60;
  t.equal(minutes, expected, 'it correctly converts days to minutes');
});

test('correctly converts 100 days to minutes', (t: Test) => {
  const minutes = daysToMinutes(100);
  const expected = 100 * 24 * 60;
  t.equal(minutes, expected, 'it correctly converts days to minutes');
});

test('correctly converts 0 days to minutes', (t: Test) => {
  const minutes = daysToMinutes(0);
  const expected = 0;
  t.equal(minutes, expected, 'it correctly converts days to minutes');
});

test('correctly converts 3 days to ms', (t: Test) => {
  const ms = daysToMs(3);
  const expected = 3 * 24 * 60 * 60 * 1000;
  t.equal(ms, expected, 'it correctly converts days to ms');
});

test('correctly converts 100 days to ms', (t: Test) => {
  const ms = daysToMs(100);
  const expected = 100 * 24 * 60 * 60 * 1000;
  t.equal(ms, expected, 'it correctly converts days to ms');
});

test('correctly converts 0 days to ms', (t: Test) => {
  const ms = daysToMs(0);
  const expected = 0;
  t.equal(ms, expected, 'it correctly converts days to ms');
});
