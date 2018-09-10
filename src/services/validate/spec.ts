import * as tape from 'tape';
import InvalidDataError = require('../../errors/invalid-data');
import {
  validateProperties,
  validatePropertiesFormatted,
  validateValues
} from './index';
import { test } from '../../test-helpers/fresh';

test('validateProperties throws an error if properties are missing', async (t: tape.Test) => {
  const testCase = (): void => validateProperties(
    { foo: 'bar', buz: false },
    'foo', 'buz', 'bar', 'baz'
  );
  t.throws(
    testCase,
    InvalidDataError,
    'throws correct error constructor'
  );
  t.throws(
    testCase,
    /Missing required properties: bar, baz/,
    'Includes missing required properties in the error message'
  );
});

test(
  'validateProperties throws an error if called on falsy type-cast input',
  async (t: tape.Test) => {
    const testCase = (): void => validateProperties(
      null as any,
      'foo', 'buz', 'bar', 'baz'
    );
    t.throws(
      testCase,
      InvalidDataError,
      'throws correct error constructor'
    );
    t.throws(
      testCase,
      /validateProperties was called on a falsy object/,
      'Includes missing required properties in the error message'
    );
  }
);

test('validateProperties does not throw if all properties are present', async (t: tape.Test) => {
  t.doesNotThrow(() => {
    validateProperties({ foo: 'bar', buz: false }, 'foo', 'buz');
  });
});

test(
  'validateProperties supports objects that do not inherit from Object.prototype',
  async (t: tape.Test) => {
    t.doesNotThrow(() => {
      const obj = Object.create(null);
      obj.foo = 'bar';

      validateProperties(obj, 'foo');
    });
  }
);

test(
  'validatePropertiesFormatted throws an error if properties are missing',
  async (t: tape.Test) => {
    const testCase = (): void => validatePropertiesFormatted(
      { buz: false, foo: 'bar' },
      {
        bar: 'The Bar One',
        foo: 'The Foo One'
      }
    );
    t.throws(
      testCase,
      InvalidDataError,
      'throws correct error constructor'
    );
    t.throws(
      testCase,
      /Missing required information: The Bar One/,
      'Includes missing required information in the error message'
    );
  }
);

test(
  'validateValues throws an error if properties are missing',
  async (t: tape.Test) => {
    const testCase = (): void => validateValues({
      baz: undefined,
      buz: null,
      foo: 'bar',
      quux: ''
    });
    t.throws(
      testCase,
      InvalidDataError,
      'throws correct error constructor'
    );
    t.throws(
      testCase,
      /Missing required properties: baz, buz, quux/,
      'Includes missing required information in the error message'
    );
  }
);
