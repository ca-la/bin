'use strict';

const {
  requireProperties,
  requirePropertiesFormatted
} = require('./index');
const { test } = require('../../test-helpers/fresh');

const ok = Promise.resolve();

test('requireProperties throws an error if properties are missing', (t) => {
  t.throws(
    () => requireProperties(
      { foo: 'bar', buz: false },
      'foo', 'buz', 'bar', 'baz'
    )
  , /Missing required properties: bar, baz/);

  return ok;
});

test('requireProperties does not throw if all properties are present', (t) => {
  t.doesNotThrow(() => {
    requireProperties({ foo: 'bar', buz: false }, 'foo', 'buz');
  });

  return ok;
});

test('requireProperties supports objects that do not inherit from Object.prototype', (t) => {
  t.doesNotThrow(() => {
    const obj = Object.create(null);
    obj.foo = 'bar';

    requireProperties(obj, 'foo');
  });

  return ok;
});

test('requirePropertiesFormatted throws an error if properties are missing', (t) => {
  t.throws(
    () => requirePropertiesFormatted(
      { foo: 'bar', buz: false },
      {
        foo: 'The Foo One',
        bar: 'The Bar One'
      }
    )
  , /Missing required information: The Bar One/);

  return ok;
});
