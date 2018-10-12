'use strict';

const {
  requireProperties,
  requirePropertiesFormatted,
  hasProperties,
  hasOnlyProperties
} = require('./index');
const { test } = require('../../test-helpers/fresh');

test('requireProperties throws an error if properties are missing', async (t) => {
  t.throws(
    () => requireProperties(
      { foo: 'bar', buz: false },
      'foo', 'buz', 'bar', 'baz'
    ),
    /Missing required properties: bar, baz/
  );
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
    ),
    /Missing required information: The Bar One/
  );
});

test('hasProperties with a matching keyset', async (t) => {
  t.true(hasProperties({ foo: 0 }, 'foo'));
});

test('hasProperties with a keyset that is a superset', async (t) => {
  t.true(hasProperties({ foo: 0, bar: 1 }, 'foo'));
});

test('hasProperties with a non-matching keyset', async (t) => {
  t.false(hasProperties({ bar: 1, baz: 2 }, 'foo'));
});

test('hasOnlyProperties with a keyset that is a superset', async (t) => {
  t.false(hasOnlyProperties({ foo: 0, bar: 1 }, 'foo'));
});

test('hasOnlyProperties with a matching keyset', async (t) => {
  t.true(hasOnlyProperties({ foo: 0 }, 'foo'));
});

test('hasOnlyProperties with a partially-matching keyset', async (t) => {
  t.false(hasOnlyProperties({ foo: 0, baz: 2 }, 'foo', 'bar'));
});
