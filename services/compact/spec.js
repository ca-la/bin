'use strict';

const { test } = require('../../test-helpers/fresh');
const compact = require('./index');

test('compact compacts objects', async (t) => {
  const input = {
    a: 123,
    b: 'something',
    c: false,
    d: null,
    e: undefined,
    f: 0,
    g: [],
    h: undefined
  };

  t.deepEqual(compact(input), {
    a: 123,
    b: 'something',
    c: false,
    d: null,
    f: 0,
    g: []
  });
});
