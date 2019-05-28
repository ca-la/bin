'use strict';

const { test } = require('../../test-helpers/simple');
const { hash, compare } = require('./index');

test('`hash` hashes a value', t => {
  return hash('hunter2').then(val => t.equal(val.slice(0, 4), '$2b$'));
});

test('`hash` returns different hashes when called multiple times', t => {
  return Promise.all([hash('hunter2'), hash('hunter2')]).then(
    ([first, second]) => {
      t.equal(first.slice(0, 4), '$2b$');
      t.equal(second.slice(0, 4), '$2b$');
      t.notEqual(first, second);
    }
  );
});

test('`compare` resolves with true when the hash is a match', t => {
  return hash('hunter2')
    .then(hashed => compare('hunter2', hashed))
    .then(matched => t.equal(matched, true));
});

test('`compare` resolves with true for older $2a$ hashes', async t => {
  const match = await compare(
    'hunter2',
    '$2a$10$r08ONCKtHeSu2oPNHCVOAeVLzaxpa.jesRyxJ5vKWaHs/BWcyRfba'
  );
  t.equal(match, true);
});

test('`compare` resolves with false when the hash is not a match', t => {
  return hash('hunter2')
    .then(hashed => compare('else', hashed))
    .then(matched => t.equal(matched, false));
});
