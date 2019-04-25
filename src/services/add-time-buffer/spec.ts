import { test, Test } from '../../test-helpers/simple';
import addTimeBuffer from '.';

test('addTimeBuffer adds the correct amount of buffer', (t: Test) => {
  const actual = addTimeBuffer(72);
  const expected = 80;
  t.equal(actual, expected, 'it returns the expected buffer');
});

test('addTimeBuffer rounds to the nearest int', (t: Test) => {
  const actual = addTimeBuffer(1.1);
  const expected = 1;
  t.equal(actual, expected, 'it returns the expected buffer');
});

test('addTimeBuffer adds to 0', (t: Test) => {
  const actual = addTimeBuffer(0);
  const expected = 0;
  t.equal(actual, expected, 'it returns the expected buffer');
});

test('addTimeBuffer adds correct buffer to 1000', (t: Test) => {
  const actual = addTimeBuffer(1000);
  const expected = 1111;
  t.equal(actual, expected, 'it returns the expected buffer');
});
