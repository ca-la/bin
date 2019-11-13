import { test, Test } from '../../test-helpers/fresh';

import { computeUniqueUPC } from './index';

function multBy3(num: string): number {
  return parseInt(num, 10) * 3;
}

// https://en.wikipedia.org/wiki/Universal_Product_Code#Check_digit_calculation
function upcSum(upc: string): number {
  return (
    multBy3(upc[0]) +
    parseInt(upc[1], 10) +
    multBy3(upc[2]) +
    parseInt(upc[3], 10) +
    multBy3(upc[4]) +
    parseInt(upc[5], 10) +
    multBy3(upc[6]) +
    parseInt(upc[7], 10) +
    multBy3(upc[8]) +
    parseInt(upc[9], 10) +
    multBy3(upc[10]) +
    parseInt(upc[11], 10)
  );
}

test('computeUniqueUPC can create a universal product code', async (t: Test) => {
  const upc = await computeUniqueUPC();
  t.true(upc.match(/^\d{12}$/), 'Is a valid upc');

  const upc2 = await computeUniqueUPC();
  t.notEqual(upc, upc2, "Identifiers don't match.");
  t.equal(upcSum(upc) % 10, 0, 'Checksum satisfies the check digit equation');
  t.equal(
    upcSum(upc2) % 10,
    0,
    'Second checksum satisfies the check digit equation'
  );
});
