'use strict';

const deserializeQuery = require('.');
const { test } = require('../../test-helpers/simple');

test('deserializeQuery with single property', t => {
  return Promise.resolve().then(() => {
    t.deepEqual(
      deserializeQuery(
        { foo: 12 },
        { foo: Number },
        { foo: n => !Number.isNaN(n) },
        { foo: 1 }
      ),
      { foo: 1 }
    );
  });
});

test('deserializeQuery with some serializing properties and some pass-through', t => {
  return Promise.resolve().then(() => {
    t.deepEqual(
      deserializeQuery(
        { foo: 12, bar: 'baz' },
        { foo: Number },
        { foo: n => !Number.isNaN(n) },
        { foo: 1, quux: null }
      ),
      { foo: 1, bar: 'baz', quux: null }
    );
  });
});

test('deserializeQuery with a failing checker', t => {
  return Promise.resolve().then(() => {
    t.deepEqual(
      deserializeQuery(
        { foo: 12 },
        { foo: Number },
        { foo: n => !Number.isNaN(n) },
        { foo: 'bar' }
      ),
      { foo: 12 }
    );
  });
});
