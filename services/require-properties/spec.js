'use strict';

const {
  requireProperties,
  requirePropertiesFormatted
} = require('./index');
const { test } = require('../../test-helpers/fresh');

test('requireProperties throws an error if properties are missing', async (t) => {
  t.throws(
    () => requireProperties(
      { foo: 'bar', buz: false },
      'foo', 'buz', 'bar', 'baz'
    )
  , /Missing required properties: bar, baz/);
});

test('requireProperties does not throw if all properties are present', async (t) => {
  t.doesNotThrow(() => {
    requireProperties({ foo: 'bar', buz: false }, 'foo', 'buz');
  });
});

test('requireProperties supports objects that do not inherit from Object.prototype', async (t) => {
  t.doesNotThrow(() => {
    const obj = Object.create(null);
    obj.foo = 'bar';

    requireProperties(obj, 'foo');
  });
});

test('requirePropertiesFormatted throws an error if properties are missing', async (t) => {
  t.throws(
    () => requirePropertiesFormatted(
      { foo: 'bar', buz: false },
      {
        foo: 'The Foo One',
        bar: 'The Bar One'
      }
    )
  , /Missing required information: The Bar One/);
});
