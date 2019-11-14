import tape from 'tape';
import { test } from '../../test-helpers/simple';
import generateLabel from './index';

test('generateLabel creates an alphabetic label', async (t: tape.Test) => {
  t.equal(generateLabel(0), 'A');
  t.equal(generateLabel(1), 'B');
  t.equal(generateLabel(25), 'Z');
  t.equal(generateLabel(26), 'AA');
  t.equal(generateLabel(27), 'AB');
  t.equal(generateLabel(52), 'BA');
  t.equal(generateLabel(53), 'BB');
  t.equal(generateLabel(26 * 27), 'AAA');
});
